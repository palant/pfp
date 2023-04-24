<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <EnterMaster v-if="keys === null" />
  <div v-else @keydown.ctrl.e.prevent="testUnknownError">
    <InProgress v-if="inProgress" />
    <EnterRecoveryPassword v-if="recoveryPasswordPromise" @done="queryRecoveryPasswordDone" />
    <Confirm ref="confirm" />
    <UnknownError v-if="unknownError" :error="unknownError" @close="unknownError = null" />
    <PasswordMessage
      ref="global-message"
      :messages="{
        import_success: true,
        unknown_data_format: false,
        syntax_error: false,
        import_no_data: false
      }"
    />

    <div class="title-container">
      <h1 class="title">{{ $t("title") }}</h1>
      <GlobalActions />
    </div>

    <div class="options">
      <div>
        <label><input v-model="showNotes" type="checkbox">{{ $t("show_notes") }}</label>
      </div>
      <div>
        <label><input v-model="showRecoveryCodes" type="checkbox">{{ $t("show_recovery_codes") }}</label>
        <span
          class="help-icon" :title="$t('recovery_code_explanation')"
          :aria-label="$t('recovery_code_explanation')"
        />
      </div>
      <div>
        <label><input v-model="showPasswords" type="checkbox">{{ $t("show_passwords") }}</label>
      </div>
    </div>

    <div class="intro">{{ $t("intro") }}</div>

    <SiteList
      ref="siteList" :show-notes="showNotes" :show-passwords="confirmedPasswords && showPasswords"
      :recovery-code-params="showRecoveryCodes ? recoveryCodeParams : null"
    />
  </div>
</template>

<script>
"use strict";

import {handleErrors} from "../common.js";
import {getPref, setPref} from "../prefs.js";
import {getKeys} from "../keys.js";
import {getRecoveryCodeParameters} from "../recoveryCodes.js";
import Confirm from "../components/Confirm.vue";
import PasswordMessage from "../components/PasswordMessage.vue";
import UnknownError from "../components/UnknownError.vue";
import GlobalActions from "./components/GlobalActions.vue";
import SiteList from "./components/SiteList.vue";
import EnterMaster from "./modals/EnterMaster.vue";
import EnterRecoveryPassword from "./modals/EnterRecoveryPassword.vue";
import InProgress from "./modals/InProgress.vue";

export default {
  name: "App",
  localePath: "allpasswords/App",
  components: {
    Confirm,
    PasswordMessage,
    UnknownError,
    GlobalActions,
    SiteList,
    EnterMaster,
    EnterRecoveryPassword,
    InProgress
  },
  data()
  {
    return {
      keys: null,
      inProgress: false,
      recoveryPasswordPromise: null,
      recoveryCodeParams: null,
      unknownError: null,
      showNotes: false,
      showRecoveryCodes: false,
      showPasswords: false,
      confirmedPasswords: false
    };
  },
  watch:
  {
    async showNotes()
    {
      await setPref("showNotes", this.showNotes);
    },
    showRecoveryCodes: handleErrors(async function()
    {
      if (this.showRecoveryCodes && !this.recoveryCodeParams)
      {
        try
        {
          let password = await this.queryRecoveryPassword();

          this.inProgress = true;
          this.recoveryCodeParams = await getRecoveryCodeParameters(password);
        }
        catch (error)
        {
          if (error == "canceled")
          {
            this.showRecoveryCodes = false;
            return;
          }
          throw error;
        }
        finally
        {
          this.inProgress = false;
        }
      }
    }),
    showPasswords()
    {
      if (this.showPasswords && !this.confirmedPasswords)
      {
        this.confirm(this.$t("show_passwords_confirm")).then(accepted =>
        {
          if (accepted)
            this.confirmedPasswords = true;
          else
            this.showPasswords = false;
        });
      }
    }
  },
  mounted: handleErrors(async function()
  {
    document.title = this.$t("title");

    this.showNotes = await getPref("showNotes", true);
    this.keys = await getKeys();
  }),
  methods: {
    testUnknownError()
    {
      this.showUnknownError(new Error("Unexpected error triggered via Ctrl+E"));
    },
    confirm(message)
    {
      return new Promise(resolve =>
      {
        let confirm = this.$refs.confirm;
        confirm.message = message;
        confirm.callback = resolve;
      });
    },
    queryRecoveryPassword()
    {
      if (!this.recoveryPasswordPromise)
      {
        this.recoveryPasswordPromise = {};
        this.recoveryPasswordPromise.promise = new Promise((resolve, reject) =>
        {
          this.recoveryPasswordPromise.resolve = resolve;
          this.recoveryPasswordPromise.reject = reject;
        });
      }
      return this.recoveryPasswordPromise.promise;
    },
    queryRecoveryPasswordDone(result)
    {
      let {resolve, reject} = this.recoveryPasswordPromise;
      this.recoveryPasswordPromise = null;
      if (result)
        resolve(result);
      else
        reject("canceled");
    },
    showGlobalMessage(message)
    {
      this.$refs["global-message"].message = message;
    },
    showUnknownError(error)
    {
      if (error.name == "InvalidCredentials")
        this.keys = null;
      else
        this.unknownError = error;
    },
    updateData()
    {
      this.$refs.siteList.updateData();
    }
  }
};
</script>
