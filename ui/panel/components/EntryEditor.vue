<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :stretch="true" @cancel="$emit('cancel')">
    <ValidatedForm class="modal-form" @validated="submit" @reset="$emit('cancel')">
      <template v-if="titleVisible">
        <label class="block-start" for="title">{{ $t("title_label") }}</label>
        <ValidatedInput
          id="title" v-model="title" v-model:error="titleError"
          v-bind="{readonly}" type="text" @validate="validateTitle"
        />
      </template>

      <label class="block-start" for="user-name">{{ $t("username_label") }}</label>
      <input id="user-name" v-model="name" v-focus v-bind="{readonly}" type="text">
      <div v-if="error" class="error">
        {{ error }}
      </div>

      <a v-if="!titleVisible" href="#" class="edit-title" @click.prevent="titleVisible = true">
        {{ $t("edit_title") }}
      </a>

      <template v-if="!recoveryActive">
        <label class="block-start" for="password-value">{{ $t("password_label") }}</label>
        <ValidatedInput
          id="password-value" ref="password" v-model="password"
          v-model:error="passwordError" type="password"
          @validate="validatePassword"
        />
        <div v-if="passwordError" class="error">
          {{ passwordError }}
        </div>
        <a class="use-recovery" href="#" @click.prevent="recoveryActive = true">{{ $t("use_recovery") }}</a>
      </template>
      <template v-else>
        <RecoveryCode @done="setPassword" />
        <a class="cancel-recovery" href="#" @click.prevent="recoveryActive = false">{{ $t("cancel_recovery") }}</a>
      </template>

      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </ValidatedForm>
  </ModalOverlay>
</template>

<script>
"use strict";

import {handleErrors} from "../../common.js";
import {nativeRequest} from "../../protocol.js";
import {passwords} from "../../proxy.js";
import RecoveryCode from "./RecoveryCode.vue";

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
      titleVisible: false,
      title: "",
      titleError: null,
      name: "",
      nameError: null,
      password: "",
      passwordError: null,
      recoveryActive: false
    };
  },
  watch:
  {
    recoveryActive()
    {
      if (!this.recoveryActive)
        this.$nextTick(() => this.$refs.password.$el.focus());
    }
  },
  methods:
  {
    validatePassword(value, setError)
    {
      if (!value)
        setError(this.$t("password_value_required"));
    },
    setPassword(password)
    {
      this.recoveryActive = false;
      this.password = password;
    },
    submit: handleErrors(async function()
    {
      try
      {
        if (!this.title)
          this.title = this.name;

        await nativeRequest("add-entry", {
          keys: this.$root.keys,
          hostname: this.$root.site,
          title: this.title,
          username: this.name,
          password: this.password
          // notes: ???
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
