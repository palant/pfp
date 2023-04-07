<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :stretch="true" @cancel="$emit('cancel')">
    <ValidatedForm v-if="!recoveryActive" class="modal-form" @validated="submit" @reset="$emit('cancel')">
      <div class="title-container" v-bind="titleVisible ? {} : {hidden: 'hidden'}">
        <label class="block-start" for="title">{{ $t("title_label") }}</label>
        <ValidatedInput
          id="title" ref="title" v-model="title" v-model:error="titleError"
          v-bind="{readonly}" type="text" @validate="validateTitle"
        />
        <div v-if="titleVisible && titleError" class="error">
          {{ titleError }}
        </div>
      </div>

      <label class="block-start" for="user-name">{{ $t("username_label") }}</label>
      <ValidatedInput
        id="user-name" v-model="name" v-focus v-bind="{readonly}" type="text"
      />
      <div v-if="!titleVisible && titleError" class="error">
        {{ titleError }}
      </div>

      <a v-if="!titleVisible" href="#" class="edit-title" @click.prevent="titleVisible = true">
        {{ $t("edit_title") }}
      </a>

      <template v-if="newEntry">
        <label class="block-start" for="password-length">{{ $t("length_label") }}</label>
        <div class="length-container">
          <input id="password-length" v-model.number="length" type="range" min="4" max="24" step="1">
          <span class="password-length-value">{{ length }}</span>
        </div>

        <label class="block-start" for="charset-lower">{{ $t("allowed_characters_label") }}</label>
        <div class="charsets-container">
          <label><input id="charset-lower" v-model="lower" type="checkbox">abc</label>
          <label><input v-model="upper" type="checkbox">XYZ</label>
          <label><input v-model="number" type="checkbox">789</label>
          <label><input v-model="symbol" type="checkbox">+^;</label>
        </div>
      </template>

      <label class="block-start" for="password-value">{{ $t("password_label") }}</label>
      <div id="password-value-container">
        <ValidatedInput
          id="password-value" ref="password" v-model="password"
          v-model:error="passwordError" :type="passwordVisible ? 'text' : 'password'"
          @validate="validatePassword"
        />
        <IconicLink
          id="show-password" href="#" :class="'iconic-link' + (passwordVisible ? ' active' : '')"
          :title="$t(passwordVisible ? 'hide_password' : 'show_password')"
          @click="passwordVisible = !passwordVisible"
        />
      </div>
      <div v-if="passwordError" class="error">
        {{ passwordError }}
      </div>
      <a class="use-recovery" href="#" @click.prevent="recoveryActive = true">{{ $t("use_recovery") }}</a>

      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </ValidatedForm>
    <RecoveryCode v-if="recoveryActive" @done="setPassword" />
  </ModalOverlay>
</template>

<script>
"use strict";

import {handleErrors} from "../../common.js";
import {nativeRequest} from "../../protocol.js";
import RecoveryCode from "./RecoveryCode.vue";

// I, l, O, 0, 1 excluded because of potential confusion. ", ', \ excluded
// because of common bugs in web interfaces (magic quotes).
const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBER = "23456789";
const SYMBOL = "!#$%&()*+,-./:;<=>?@[]^_{|}~";

export default {
  name: "EntryEditor",
  localePath: "panel/components/EntryEditor",
  components: {
    RecoveryCode
  },
  emits: ["cancel"],
  data()
  {
    return {
      newEntry: true,
      titleVisible: false,
      title: "",
      titleError: null,
      name: "",
      length: 16,
      lower: true,
      upper: true,
      number: true,
      symbol: true,
      password: "",
      passwordError: null,
      passwordVisible: false,
      recoveryActive: false
    };
  },
  watch:
  {
    name()
    {
      if (!this.titleVisible)
        this.title = this.name;
    },
    titleVisible()
    {
      if (this.titleVisible)
        this.$nextTick(() => this.$refs.title.$el.focus());
    },
    length()
    {
      this.generatePassword();
    },
    lower()
    {
      this.generatePassword();
    },
    upper()
    {
      this.generatePassword();
    },
    number()
    {
      this.generatePassword();
    },
    symbol()
    {
      this.generatePassword();
    },
    recoveryActive()
    {
      if (!this.recoveryActive)
        this.$nextTick(() => this.$refs.password.$el.focus());
    }
  },
  mounted()
  {
    if (this.newEntry)
      this.generatePassword();
  },
  methods:
  {
    validateTitle(value, setError)
    {
      if (!value)
        setError(this.$t("title_required"));
    },
    validatePassword(value, setError)
    {
      if (!value)
        setError(this.$t("password_value_required"));
    },
    generatePassword()
    {
      let array = new Uint8Array(this.length);
      crypto.getRandomValues(array);

      let charsets = [];
      if (this.lower)
        charsets.push(LOWERCASE);
      if (this.upper)
        charsets.push(UPPERCASE);
      if (this.number)
        charsets.push(NUMBER);
      if (this.symbol)
        charsets.push(SYMBOL);

      if (!charsets.length)
        return;

      let lengthSum = (previous, current) => previous + current.length;
      let numChars = charsets.reduce(lengthSum, 0);
      let seen = new Set();

      let result = [];
      for (let i = 0; i < array.length; i++)
      {
        if (charsets.length - seen.size >= array.length - i)
        {
          for (let value of seen.values())
          {
            let index = charsets.indexOf(value);
            if (index >= 0)
              charsets.splice(index, 1);
          }
          seen.clear();
          numChars = charsets.reduce(lengthSum, 0);
        }

        let index = array[i] % numChars;
        for (let charset of charsets)
        {
          if (index < charset.length)
          {
            result.push(charset[index]);
            seen.add(charset);
            break;
          }
          index -= charset.length;
        }
      }
      this.password = result.join("");
    },
    setPassword(password)
    {
      this.recoveryActive = false;
      if (password !== null)
      {
        this.newEntry = false;
        this.password = password;
      }
    },
    submit: handleErrors(async function()
    {
      try
      {
        await nativeRequest("add-entry", {
          keys: this.$root.keys,
          hostname: this.$root.site,
          title: this.title,
          username: this.name,
          password: this.password
        });

        this.$root.pwdList = await this.$root.getEntries(this.$root.site);
        this.$emit("cancel");
      }
      catch (error)
      {
        if (error.code == "EntryExists")
        {
          this.titleError = this.$t("title_exists");
          this.titleVisible = true;
        }
        else
          throw error;
      }
    })
  }
};
</script>
