<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :stretch="true" @cancel="$emit('cancel')">
    <ValidatedForm class="modal-form" @validated="submit" @reset="$emit('cancel')">
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

      <template v-if="!recoveryActive">
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
    recoveryActive()
    {
      if (!this.recoveryActive)
        this.$nextTick(() => this.$refs.password.$el.focus());
    }
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
    setPassword(password)
    {
      this.recoveryActive = false;
      this.password = password;
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
