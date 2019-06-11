<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div @keydown.ctrl.69.prevent="testUnknownError"
       @keydown.ctrl.exact="tabNavigation"
       @keydown.meta.exact="tabNavigation"
  >
    <confirm ref="confirm" />
    <unknown-error v-if="unknownError" :error="unknownError" @close="unknownError = null" />

    <change-master v-if="masterPasswordState == 'unset' || (masterPasswordState == 'set' && resettingMaster)" />
    <enter-master v-else-if="masterPasswordState == 'set'" />
    <migration v-else-if="masterPasswordState == 'migrating'" />
    <div v-else-if="masterPasswordState == 'known'" class="tabs">
      <div v-keyboard-navigation="tab" class="tablist">
        <div />

        <a href="#" class="tab select-site"
           :class="{active: currentPage == 'select-site'}"
           :title="$t('select_site')"
           @click.prevent="currentPage = 'select-site'"
        />

        <a href="#" class="tab password-list"
           :class="{active: currentPage == 'password-list'}"
           :title="$t('password_list')"
           @click.prevent="currentPage = 'password-list'"
        />

        <a href="#" class="tab sync"
           :class="{active: currentPage == 'sync', failed: $app.sync.error && $app.sync.error != 'sync_connection_error'}"
           :title="$t($app.sync.provider ? 'sync_state' : 'sync_setup')"
           @click.prevent="currentPage = 'sync'"
        />

        <a href="#" class="tab settings"
           :class="{active: currentPage == 'settings'}"
           :title="$t('settings')"
           @click.prevent="currentPage = 'settings'"
        />

        <div class="spacer" />

        <a v-cancel href="#" class="tab lock" :title="$t('lock_passwords')"
           @click.prevent="lockPasswords"
        />
      </div>
      <select-site v-if="currentPage == 'select-site'" @selected="currentPage = 'password-list'" />
      <password-list v-if="currentPage == 'password-list'" />
      <sync v-else-if="currentPage == 'sync'" />
      <settings v-else-if="currentPage == 'settings'" />
    </div>
  </div>
</template>

<script>
"use strict";

import {getSiteDisplayName, keyboardNavigationType} from "../common";
import {port} from "../messaging";
import {masterPassword} from "../proxy";
import EnterMaster from "./pages/EnterMaster.vue";
import ChangeMaster from "./pages/ChangeMaster.vue";
import Migration from "./pages/Migration.vue";
import PasswordList from "./pages/PasswordList.vue";
import SelectSite from "./pages/SelectSite.vue";
import Settings from "./pages/Settings.vue";
import Sync from "./pages/Sync.vue";
import Confirm from "../components/Confirm.vue";
import UnknownError from "../components/UnknownError.vue";

const pages = [
  "select-site",
  "password-list",
  "sync",
  "settings"
];

let initialData = {
  site: null,
  origSite: null,
  pwdList: null,
  masterPasswordState: null,
  sync: null
};

let app = null;

port.on("init", state =>
{
  let target = app || initialData;
  for (let key of Object.keys(initialData))
    if (key in state)
      target[key] = state[key];
});

export default {
  name: "App",
  localePath: "panel/App",
  components: {
    "change-master": ChangeMaster,
    "enter-master": EnterMaster,
    "migration": Migration,
    "password-list": PasswordList,
    "select-site": SelectSite,
    "settings": Settings,
    "sync": Sync,
    "confirm": Confirm,
    "unknown-error": UnknownError
  },
  data()
  {
    return Object.assign({
      unknownError: null,
      resettingMaster: false,
      currentPage: initialData.site === "" ? "select-site" : "password-list"
    }, initialData);
  },
  computed: {
    siteDisplayName()
    {
      return getSiteDisplayName(this.site);
    }
  },
  watch: {
    site()
    {
      if (this.currentPage == "password-list" && this.site === "")
        this.currentPage = "select-site";
    }
  },
  created: function()
  {
    app = this;
  },
  methods:
  {
    testUnknownError()
    {
      this.showUnknownError(new Error("Unexpected error triggered via Ctrl+E"));
    },
    tabNavigation(event)
    {
      let type = keyboardNavigationType(event);
      let index = pages.indexOf(this.currentPage);
      if (!type || index < 0)
        return;

      event.preventDefault();
      if (type.startsWith("back") && index - 1 >= 0)
        this.currentPage = pages[index - 1];
      else if (type.startsWith("forward") && index + 1 < pages.length)
        this.currentPage = pages[index + 1];
      else if (type.startsWith("start"))
        this.currentPage = pages[0];
      else if (type.startsWith("end"))
        this.currentPage = pages[pages.length - 1];
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
    showUnknownError(error)
    {
      this.unknownError = error;
    },
    lockPasswords()
    {
      masterPassword.forgetPassword()
        .then(() => this.masterPasswordState = "set")
        .catch(this.showUnknownError);
    }
  }
};
</script>
