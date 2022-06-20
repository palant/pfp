<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :stretch="true" @cancel="$emit('cancel')">
    <ValidatedForm class="modal-form" @validated="submit" @reset="$emit('cancel')">
      <div class="warning">{{ $t("warning") }}</div>

      <PasswordNameEntry ref="name-entry" v-model="name" v-model:revision="revision" class="block-start" />

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

import {passwords} from "../../proxy.js";
import PasswordNameEntry from "./PasswordNameEntry.vue";
import RecoveryCode from "./RecoveryCode.vue";

export default {
  name: "StoredPassword",
  localePath: "panel/components/StoredPassword",
  components: {
    PasswordNameEntry,
    RecoveryCode
  },
  emits: ["cancel"],
  data()
  {
    return {
      name: "",
      revision: "1",
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
    submit()
    {
      let revision = this.revision != "1" ? this.revision : "";

      passwords.addStored({
        site: this.$root.site,
        name: this.name,
        revision,
        password: this.password
      }).then(pwdList =>
      {
        this.$root.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(error =>
      {
        if (error == "alreadyExists")
          this.$refs["name-entry"].nameConflict();
        else
          this.$root.showUnknownError(error);
      });
    }
  }
};
</script>
