<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <validated-form class="page" @validated="submit"
                  @reset.native.prevent="hasPassword && ($app.resettingMaster = false)"
  >
    <div>
      <template v-if="!hasPassword">
        {{ $t("new_master_message") }}
      </template>
      <div v-else class="warning">
        {{ $t("reset_master_message") }}
      </div>

      {{ $t("master_security_message") }}
      <external-link type="documentation" param="choosing-master-password">
        {{ $t(".learn_more") }}
      </external-link>
    </div>
    <label class="block-start" for="new-master">{{ $t("new_master") }}</label>
    <validated-input id="new-master" v-model="newMaster" v-focus type="password"
                     @validate="validateMasterPassword"
    />
    <div v-if="newMaster.error" class="error">
      {{ newMaster.error }}
    </div>
    <password-score ref="passwordScore" :password="newMaster.value" />
    <label class="block-start" for="new-master-repeat">{{ $t("new_master_repeat") }}</label>
    <validated-input id="new-master-repeat" v-model="newMasterRepeat"
                     type="password" @validate="validateMasterPasswordRepeat"
    />
    <div v-if="newMasterRepeat.error" class="error">
      {{ newMasterRepeat.error }}
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
      <button v-if="hasPassword" v-cancel type="reset">{{ $t("/cancel") }}</button>
    </div>
  </validated-form>
</template>

<script>
"use strict";

import {validateMasterPassword} from "../../components/EnterMaster.vue";
import {passwords, masterPassword} from "../../proxy";
import PasswordScore from "../components/PasswordScore.vue";

export default {
  name: "ChangeMaster",
  localePath: "panel/pages/ChangeMaster",
  components: {
    "password-score": PasswordScore
  },
  data()
  {
    return {
      newMaster: {value: ""},
      newMasterRepeat: {value: ""}
    };
  },
  computed: {
    hasPassword()
    {
      return this.$app.masterPasswordState != "unset";
    }
  },
  methods: {
    submit()
    {
      let score = this.$refs.passwordScore.value;
      let ask = score < 3 ? this.$app.confirm(this.$t("weak_password")) : Promise.resolve(true);
      ask.then(accepted =>
      {
        if (accepted)
        {
          masterPassword.changePassword(this.newMaster.value)
            .then(() => passwords.getPasswords(this.$app.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              this.$app.origSite = origSite;
              this.$app.site = site;
              this.$app.pwdList = pwdList;
              this.$app.masterPasswordState = "known";
              this.$app.resettingMaster = false;
            })
            .catch(this.$app.showUnknownError);
        }
      });
    },
    validateMasterPassword,
    validateMasterPasswordRepeat(newData)
    {
      if (newData.value != this.newMaster.value)
        newData.error = this.$t("passwords_differ");
    }
  }
};
</script>
