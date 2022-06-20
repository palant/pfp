<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div @keydown.ctrl.e.prevent="testUnknownError">
    <InProgress v-if="inProgress" />
    <EnterMaster v-if="masterPromise" @done="enterMasterDone" />
    <Confirm ref="confirm" />
    <SizeSelector />
    <UnknownError v-if="unknownError" :error="unknownError" @close="unknownError = null" />
    <PasswordMessage
      ref="global-message"
      :messages="{
        import_success: true,
        unknown_data_format: false,
        syntax_error: false
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
        <label><input v-model="showPasswords" type="checkbox">{{ $t("show_passwords") }}</label>
      </div>
    </div>

    <div class="intro">{{ $t("intro") }}</div>

    <SiteList ref="siteList" :show-notes="showNotes" :show-passwords="confirmedPasswords && showPasswords" />
  </div>
</template>

<script>
"use strict";

import {setErrorHandler} from "../proxy.js";
import Confirm from "../components/Confirm.vue";
import PasswordMessage from "../components/PasswordMessage.vue";
import UnknownError from "../components/UnknownError.vue";
import GlobalActions from "./components/GlobalActions.vue";
import SiteList from "./components/SiteList.vue";
import SizeSelector from "../components/SizeSelector.vue";
import EnterMaster from "./modals/EnterMaster.vue";
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
    SizeSelector,
    EnterMaster,
    InProgress
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
  mounted()
  {
    document.title = this.$t("title");
    setErrorHandler("master_password_required", () =>
    {
      return new Promise((resolve, reject) =>
      {
        this.masterPromise = {resolve, reject};
      });
    });
  },
  methods: {
    testUnknownError()
    {
      this.showUnknownError(new Error("Unexpected error triggered via Ctrl+E"));
    },
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
    showUnknownError(error)
    {
      if (error == "canceled")
        return;

      this.unknownError = error;
    },
    updateData()
    {
      this.$refs.siteList.updateData();
    }
  }
};
</script>
