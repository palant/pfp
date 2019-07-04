<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :stretch="true" @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="submit" @reset.native="$emit('cancel')">
      <div class="warning">{{ $t("warning") }}</div>

      <password-name-entry ref="name-entry" v-model="name" :revision.sync="revision" class="block-start" />

      <template v-if="!recoveryActive">
        <label class="block-start" for="password-value">{{ $t("password_label") }}</label>
        <validated-input id="password-value" ref="password" v-model="password"
                         :error.sync="passwordError" type="password"
                         @validate="validatePassword"
        />
        <div v-if="passwordError" class="error">
          {{ passwordError }}
        </div>
        <a class="use-recovery" href="#" @click.prevent="recoveryActive = true">{{ $t("use_recovery") }}</a>
      </template>
      <template v-else>
        <recovery-code @done="setPassword" />
        <a class="cancel-recovery" href="#" @click.prevent="recoveryActive = false">{{ $t("cancel_recovery") }}</a>
      </template>

      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";
import PasswordNameEntry from "./PasswordNameEntry.vue";
import RecoveryCode from "./RecoveryCode.vue";

export default {
  name: "StoredPassword",
  components: {
    "password-name-entry": PasswordNameEntry,
    "recovery-code": RecoveryCode
  },
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
        site: this.$app.site,
        name: this.name,
        revision,
        password: this.password
      }).then(pwdList =>
      {
        this.$app.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(error =>
      {
        if (error == "alreadyExists")
          this.$refs["name-entry"].nameConflict();
        else
          this.$app.showUnknownError(error);
      });
    }
  }
};
</script>
