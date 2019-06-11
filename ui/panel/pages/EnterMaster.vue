<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <validated-form class="page" @validated="submit">
    <label for="master-password">{{ $t("master_password") }}</label>
    <validated-input id="master-password" v-model="masterPassword" v-focus
                     type="password" @validate="validateMasterPassword"
    />
    <div v-if="masterPassword.error" class="error">
      {{ masterPassword.error }}
    </div>
    <div class="button-container">
      <button>{{ $t("submit") }}</button>
    </div>
    <div class="link-container">
      <a href="#" @click.prevent="$app.resettingMaster = true">
        {{ $t("reset") }}
      </a>
    </div>
  </validated-form>
</template>

<script>
"use strict";

import {masterPassword, passwords} from "../../proxy";
import {validateMasterPassword} from "../../common";

export default {
  name: "EnterMaster",
  localePath: "panel/pages/EnterMaster",
  data()
  {
    return {
      masterPassword: {value: ""}
    };
  },
  methods: {
    submit()
    {
      masterPassword.checkPassword(this.masterPassword.value)
        .then(() => passwords.getPasswords(this.$app.origSite))
        .then(([origSite, site, pwdList]) =>
        {
          this.$app.origSite = origSite;
          this.$app.site = site;
          this.$app.pwdList = pwdList;
          this.$app.masterPasswordState = "known";
        }).catch(error =>
        {
          if (error == "declined")
            this.masterPassword.error = this.$t("password_declined");
          else if (error == "migrating")
            this.$app.masterPasswordState = "migrating";
          else
            this.$app.showUnknownError(error);
        });
    },
    validateMasterPassword
  }
};
</script>
