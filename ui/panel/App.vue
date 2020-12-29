<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div @keydown.ctrl.e.prevent="testUnknownError"
       @keydown.ctrl.exact="tabNavigation"
       @keydown.meta.exact="tabNavigation"
  >
    <Confirm ref="confirm" />
    <UnknownError v-if="unknownError" :error="unknownError" @close="unknownError = null" />

    <ChangeMaster v-if="masterPasswordState == 'unset' || (masterPasswordState == 'set' && resettingMaster)" />
    <EnterMaster v-else-if="masterPasswordState == 'set'" />
    <div v-else-if="masterPasswordState == 'known'" class="tabs">
      <nav v-keyboard-navigation:tab class="tablist" role="list">
        <div />

        <IconicLink class="tab select-site" role="listitem"
                    :class="{active: currentPage == 'select-site'}"
                    :title="$t('select_site')"
                    @click="currentPage = 'select-site'"
        />

        <IconicLink class="tab password-list" role="listitem"
                    :class="{active: currentPage == 'password-list'}"
                    :title="$t('password_list')"
                    @click="currentPage = 'password-list'"
        />

        <IconicLink class="tab sync" role="listitem"
                    :class="{active: currentPage == 'sync', failed: $root.sync.error && $root.sync.error != 'sync_connection_error'}"
                    :title="$t('sync')"
                    @click="currentPage = 'sync'"
        />

        <IconicLink class="tab settings" role="listitem"
                    :class="{active: currentPage == 'settings'}"
                    :title="$t('settings')"
                    @click="currentPage = 'settings'"
        />

        <div class="spacer" />

        <IconicLink class="tab lock" role="listitem"
                    :title="$t('lock_passwords')"
                    @click="lockPasswords"
        />
      </nav>
      <SelectSite v-if="currentPage == 'select-site'" @selected="currentPage = 'password-list'" />
      <PasswordList v-if="currentPage == 'password-list'" />
      <Sync v-else-if="currentPage == 'sync'" />
      <Settings v-else-if="currentPage == 'settings'" />
    </div>
  </div>
</template>

<script>
"use strict";

import {getSiteDisplayName, keyboardNavigationType} from "../common.js";
import {port} from "../messaging.js";
import {masterPassword} from "../proxy.js";
import EnterMaster from "./pages/EnterMaster.vue";
import ChangeMaster from "./pages/ChangeMaster.vue";
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

let app = null;

export default {
  name: "App",
  localePath: "panel/App",
  components: {
    ChangeMaster,
    EnterMaster,
    PasswordList,
    SelectSite,
    Settings,
    Sync,
    Confirm,
    UnknownError
  },
  data()
  {
    return {
      unknownError: null,
      resettingMaster: false,
      currentPage: "password-list",
      site: null,
      origSite: null,
      pwdList: null,
      masterPasswordState: null,
      sync: null
    };
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
  created()
  {
    port.on("init", state =>
    {
      for (let key of Object.keys(state))
        this[key] = state[key];
    });
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
