<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <validated-form id="enter-master" class="page" @validated="submit">
    <label for="master-password">{{ $t("master_password") }}</label>
    <validated-input id="master-password" ref="masterPassword"
                     v-model="masterPassword" v-focus
                     type="password" @validate="validateMasterPassword"
    />
    <div v-if="masterPassword.error" class="error">
      {{ masterPassword.error }}
    </div>
    <div class="button-container">
      <button>{{ $t("enter_master_submit") }}</button>
    </div>
    <div class="link-container">
      <router-link to="/change-master">
        {{ $t("reset_master_link") }}
      </router-link>
    </div>
  </validated-form>
</template>

<script>
"use strict";

import {masterPassword, passwords} from "../../proxy";
import {app, showUnknownError} from "../App.vue";
let {validateMasterPassword} = require("./changeMaster.vue");

export default {
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
        .then(() => passwords.getPasswords(app.origSite))
        .then(([origSite, site, pwdList]) =>
        {
          app.origSite = origSite;
          app.site = site;
          app.pwdList = pwdList;
          app.masterPasswordState = "known";
        }).catch(error =>
        {
          if (error == "declined")
            this.masterPassword.error = this.$t("password_declined");
          else if (error == "migrating")
            app.masterPasswordState = "migrating";
          else
            showUnknownError(error);
        });
    },
    validateMasterPassword
  }
};
</script>
