<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <in-progress v-if="inProgress" />
    <enter-master v-if="masterPromise" @cancel="enterMasterDone" />
    <confirm ref="confirm" />
    <unknown-error v-if="unknownError" :error="unknownError" />
    <password-message ref="global-message"
                      :messages="{
                        allpasswords_import_success: true
                      }"
    />

    <div class="title-container">
      <h1 class="title">{{ $t("allpasswords_title") }}</h1>
      <global-actions />
    </div>

    <div class="options">
      <div>
        <label><input v-model="showNotes" type="checkbox">{{ $t("allpasswords_show_notes") }}</label>
      </div>
      <div>
        <label><input v-model="showPasswords" type="checkbox">{{ $t("allpasswords_show_passwords") }}</label>
      </div>
    </div>

    <div class="intro">{{ $t("allpasswords_intro") }}</div>

    <site-list ref="siteList" :show-notes="showNotes" :show-passwords="confirmedPasswords && showPasswords" />
  </div>
</template>

<script>
"use strict";

import {setErrorHandler} from "../proxy";
import Confirm from "../panel/components/Confirm.vue";
import PasswordMessage from "../panel/components/PasswordMessage.vue";
import UnknownError from "../panel/components/UnknownError.vue";
import GlobalActions from "./components/GlobalActions.vue";
import SiteList from "./components/SiteList.vue";
import EnterMaster from "./modals/EnterMaster.vue";
import InProgress from "./modals/InProgress.vue";

export default {
  name: "App",
  components: {
    "confirm": Confirm,
    "password-message": PasswordMessage,
    "unknown-error": UnknownError,
    "global-actions": GlobalActions,
    "site-list": SiteList,
    "enter-master": EnterMaster,
    "in-progress": InProgress
  },
  data()
  {
    return {
      inProgress: false,
      masterPromise: null,
      unknownError: null,
      showNotes: !("hideNotes" in window.localStorage),
      showPasswords: false,
      confirmedPasswords: false
    };
  },
  watch:
  {
    showNotes()
    {
      if (this.showNotes)
        delete window.localStorage.hideNotes;
      else
        window.localStorage.hideNotes = true;
    },
    showPasswords()
    {
      if (this.showPasswords && !this.confirmedPasswords)
      {
        this.confirm(this.$t("allpasswords_show_confirm")).then(accepted =>
        {
          if (accepted)
            this.confirmedPasswords = true;
          else
            this.showPasswords = false;
        });
      }
    }
  },
  mounted()
  {
    document.title = this.$t("allpasswords_title");
    setErrorHandler("master_password_required", () =>
    {
      return new Promise((resolve, reject) =>
      {
        this.masterPromise = {resolve, reject};
      });
    });
  },
  methods: {
    confirm(message)
    {
      return new Promise((resolve, reject) =>
      {
        let confirm = this.$refs.confirm;
        confirm.message = message;
        confirm.callback = resolve;
      });
    },
    enterMasterDone(success)
    {
      let {resolve, reject} = this.masterPromise;
      this.masterPromise = null;
      if (success)
        resolve();
      else
        reject("canceled");
    },
    showGlobalMessage(message)
    {
      this.$refs["global-message"].message = message;
    },
    localize(error)
    {
      if (/\s/.test(error))
        return error;

      return this.$t(error) || error;
    },
    showUnknownError(error)
    {
      if (error == "canceled")
        return;

      this.unknownError = this.localize(error);
    },
    updateData()
    {
      this.$refs.siteList.updateData();
    }
  }
};
</script>
