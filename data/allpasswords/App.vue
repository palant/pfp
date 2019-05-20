<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <in-progress v-if="inProgress" />
    <enter-master v-if="masterPromise" @cancel="enterMasterDone" />

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
import GlobalActions from "./components/GlobalActions.vue";
import SiteList from "./components/SiteList.vue";
import EnterMaster from "./modals/EnterMaster.vue";
import InProgress from "./modals/InProgress.vue";

export default {
  name: "App",
  components: {
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
        if (confirm(this.$t("allpasswords_show_confirm")))
          this.confirmedPasswords = true;
        else
          this.$nextTick(() => this.showPasswords = false);
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
    enterMasterDone(success)
    {
      let {resolve, reject} = this.masterPromise;
      this.masterPromise = null;
      if (success)
        resolve();
      else
        reject("canceled");
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

      alert(this.localize(error));
    },
    updateData()
    {
      this.$refs.siteList.updateData();
    }
  }
};
</script>
