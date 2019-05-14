<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :stretch="true" @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="submit" @reset.native="$emit('cancel')">
      <div class="warning" data-l10n-id="">{{ $t("stored_password_warning") }}</div>

      <label class="block-start" for="user-name">{{ $t("user_name") }}</label>
      <validated-input id="user-name" v-model.trim="name" v-focus type="text" @validate="validateName" />
      <div v-if="name.error" class="error">
        {{ name.error }}
      </div>

      <a v-if="!revisionVisible" href="#" class="change-password-revision" @click.prevent="revisionVisible = true">
        {{ $t("change_password_revision") }}
      </a>
      <template v-else>
        <label class="block-start" for="password-revision">{{ $t("password_revision") }}</label>
        <input id="password-revision" v-model.trim="revision" type="text">
      </template>

      <template v-if="!recoveryActive">
        <label class="block-start" for="password-value">{{ $t("password_value") }}</label>
        <validated-input id="password-value" v-model.trim="password" type="password" @validate="validatePassword" />
        <div v-if="password.error" class="error">
          {{ password.error }}
        </div>
        <a class="use-recovery" href="#" @click.prevent="recoveryActive = true">{{ $t("use_recovery") }}</a>
      </template>
      <template v-else>
        <recovery-code @done="setPassword" />
        <a class="cancel-recovery" href="#" @click.prevent="recoveryActive = false">{{ $t("cancel_recovery") }}</a>
      </template>

      <div class="button-container">
        <button type="submit">{{ $t("save_password") }}</button>
        <button type="reset">{{ $t("cancel") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";
import RecoveryCode from "./RecoveryCode.vue";

export default {
  name: "StoredPassword",
  components: {
    "recovery-code": RecoveryCode
  },
  data()
  {
    return {
      name: "",
      revision: "1",
      revisionVisible: false,
      password: {
        value: "",
        error: null
      },
      recoveryActive: false
    };
  },
  watch: {
    revision()
    {
      if (this.name.error == this.$t("user_name_exists"))
        this.name.error = null;
    }
  },
  methods:
  {
    validateName(newData)
    {
      if (!newData.value)
        newData.error = this.$t("user_name_required");
    },
    validatePassword(newData)
    {
      if (!newData.value)
        newData.error = this.$t("password_value_required");
    },
    setPassword(password)
    {
      this.recoveryActive = false;
      this.password.value = password;
    },
    submit()
    {
      let revision = this.revision != "1" ? this.revision : "";

      passwords.addStored({
        site: this.$app.site,
        name: this.name.value,
        revision,
        password: this.password.value
      }).then(pwdList =>
      {
        this.$app.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(error =>
      {
        if (error == "alreadyExists")
        {
          this.name.error = this.$t("user_name_exists");
          this.revisionVisible = true;
        }
        else
          this.$app.showUnknownError(error);
      });
    }
  }
};
</script>
