<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ValidatedForm
    class="page" @validated="submit"
    @reset.prevent="hasPassword && ($root.resettingMaster = false)"
  >
    <div>
      <template v-if="!hasPassword">
        {{ $t("new_master_message") }}
      </template>
      <div v-else class="warning">
        {{ $t("reset_master_message") }}
      </div>

      {{ $t("master_security_message") }}
      <ExternalLink type="documentation" param="choosing-master-password">
        {{ $t(".learn_more") }}
      </ExternalLink>
    </div>
    <label class="block-start" for="new-master">{{ $t("new_master") }}</label>
    <ValidatedInput
      id="new-master" v-model="newMaster"
      v-model:error="newMasterError" v-focus type="password"
      @validate="validateMasterPassword"
    />
    <div v-if="newMasterError" class="error">
      {{ newMasterError }}
    </div>
    <PasswordScore ref="passwordScore" :password="newMaster" />
    <label class="block-start" for="new-master-repeat">{{ $t("new_master_repeat") }}</label>
    <ValidatedInput
      id="new-master-repeat" v-model="newMasterRepeat"
      v-model:error="newMasterRepeatError" type="password"
      @validate="validateMasterPasswordRepeat"
    />
    <div v-if="newMasterRepeatError" class="error">
      {{ newMasterRepeatError }}
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
      <button v-if="hasPassword" v-cancel type="reset">{{ $t("/cancel") }}</button>
    </div>
  </ValidatedForm>
</template>

<script>
"use strict";

import {passwords, masterPassword} from "../../proxy.js";
import {validateMasterPassword} from "../../components/EnterMasterShared.vue";
import PasswordScore from "../components/PasswordScore.vue";

export default {
  name: "ChangeMaster",
  localePath: "panel/pages/ChangeMaster",
  components: {
    PasswordScore
  },
  data()
  {
    return {
      newMaster: "",
      newMasterError: null,
      newMasterRepeat: "",
      newMasterRepeatError: null
    };
  },
  computed: {
    hasPassword()
    {
      return this.$root.masterPasswordState != "unset";
    }
  },
  methods: {
    submit()
    {
      let score = this.$refs.passwordScore.value;
      let ask = score < 3 ? this.$root.confirm(this.$t("weak_password")) : Promise.resolve(true);
      ask.then(accepted =>
      {
        if (accepted)
        {
          masterPassword.changePassword(this.newMaster)
            .then(() => passwords.getPasswords(this.$root.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              this.$root.origSite = origSite;
              this.$root.site = site;
              this.$root.pwdList = pwdList;
              this.$root.masterPasswordState = "known";
              this.$root.resettingMaster = false;
            })
            .catch(this.$root.showUnknownError);
        }
      });
    },
    validateMasterPassword,
    validateMasterPasswordRepeat(value, setError)
    {
      if (value != this.newMaster)
        setError(this.$t("passwords_differ"));
    }
  }
};
</script>
