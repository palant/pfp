<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div
    @keydown.ctrl.e.prevent="testUnknownError"
    @keydown.ctrl.exact="tabNavigation"
    @keydown.meta.exact="tabNavigation"
  >
    <Confirm ref="confirm" />
    <UnknownError v-if="unknownError" :error="unknownError" @close="unknownError = null" />

    <ChangeMaster v-if="false" />
    <EnterMaster v-else-if="!keys" />
    <DeprecationNote v-if="false" />
    <div v-else-if="keys" class="tabs">
      <nav v-keyboard-navigation:tab class="tablist" role="list">
        <div />

        <IconicLink
          class="tab select-site" role="listitem"
          :class="{active: currentPage == 'select-site'}"
          :title="$t('select_site')"
          @click="currentPage = 'select-site'"
        />

        <IconicLink
          class="tab password-list" role="listitem"
          :class="{active: currentPage == 'password-list'}"
          :title="$t('password_list')"
          @click="currentPage = 'password-list'"
        />

        <IconicLink
          class="tab sync" role="listitem"
          :class="{active: currentPage == 'sync', failed: $root.sync.error && $root.sync.error != 'sync_connection_error'}"
          :title="$t('sync')"
          @click="currentPage = 'sync'"
        />

        <IconicLink
          class="tab settings" role="listitem"
          :class="{active: currentPage == 'settings'}"
          :title="$t('settings')"
          @click="currentPage = 'settings'"
        />

        <div class="spacer" />

        <IconicLink
          class="tab lock" role="listitem"
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

import {normalizeHostname, getSiteDisplayName, keyboardNavigationType, handleErrors} from "../common.js";
import {port} from "../messaging.js";
import {nativeRequest} from "../protocol.js";
import {masterPassword, passwords, ui, sync} from "../proxy.js";
import EnterMaster from "./pages/EnterMaster.vue";
import ChangeMaster from "./pages/ChangeMaster.vue";
import DeprecationNote from "./pages/DeprecationNote.vue";
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
    DeprecationNote,
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
      deprecationAccepted: false,
      currentPage: "password-list",
      site: undefined,
      pwdList: null,
      keys: null,
      sync: {}
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
      if (this.currentPage == "password-list" && this.site === null)
        this.currentPage = "select-site";
    }
  },
  created: async function()
  {
    let data = {};
    [data.site, data.deprecationAccepted, data.keys] = await Promise.all([
      ui.getCurrentHost(),
      ui.isDeprecationAccepted(),
      masterPassword.getKeys()
    ]);

    data.site = normalizeHostname(data.site);

    if (data.keys)
    {
      data.pwdList = await this.getEntries(data.site, data.keys);
    }

    // Update all data at once to prevent inconsistent intermediate states
    Object.assign(this, data);

    await this.updateSyncState();
    port.on("syncUpdate", () => this.updateSyncState());
  },
  methods:
  {
    async getEntries(hostname, keys = this.keys)
    {
      if (hostname === null)
        return [];

      let entries = await nativeRequest("get-entries", {
        keys,
        hostname
      });
      entries.sort(function(a, b)
      {
        if (a.title < b.title)
          return -1;
        if (b.title > a.title)
          return 1;
        return 0;
      });
      return entries;
    },

    updateSyncState: async function()
    {
      let [syncData, isSyncing] = await Promise.all([
        sync.getSyncData(),
        sync.isSyncing()
      ]);

      this.sync = {
        provider: syncData.provider || null,
        username: syncData.username || null,
        lastSync: syncData.lastSync || null,
        error: syncData.error || null,
        isSyncing
      };
    },
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
    lockPasswords: handleErrors(async function()
    {
      await masterPassword.forgetKeys();
      this.keys = null;
    })
  }
};
</script>
