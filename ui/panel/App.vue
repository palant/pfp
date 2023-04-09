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

    <EnterMaster v-else-if="!keys" />
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
      <Settings v-else-if="currentPage == 'settings'" />
    </div>
  </div>
</template>

<script>
"use strict";

import {
  normalizeHostname, getSiteDisplayName, keyboardNavigationType, handleErrors, getCurrentHost
} from "../common.js";
import {nativeRequest} from "../protocol.js";
import {masterPassword} from "../proxy.js";
import EnterMaster from "./pages/EnterMaster.vue";
import PasswordList from "./pages/PasswordList.vue";
import SelectSite from "./pages/SelectSite.vue";
import Settings from "./pages/Settings.vue";
import Confirm from "../components/Confirm.vue";
import UnknownError from "../components/UnknownError.vue";

const pages = [
  "select-site",
  "password-list",
  "settings"
];

export default {
  name: "App",
  localePath: "panel/App",
  components: {
    EnterMaster,
    PasswordList,
    SelectSite,
    Settings,
    Confirm,
    UnknownError
  },
  data()
  {
    return {
      unknownError: null,
      currentPage: "password-list",
      hostname: undefined,
      origHostname: undefined,
      pwdList: [],
      keys: null
    };
  },
  computed: {
    siteDisplayName()
    {
      return getSiteDisplayName(this.hostname);
    }
  },
  watch: {
    hostname()
    {
      if (this.currentPage == "password-list" && this.hostname === null)
        this.currentPage = "select-site";
    }
  },
  created: async function()
  {
    let [hostname, keys] = await Promise.all([
      getCurrentHost(),
      masterPassword.getKeys()
    ]);
    this.origHostname = this.hostname = normalizeHostname(hostname);

    this.keys = keys;
    if (this.keys)
      await this.updateEntries();
  },
  methods:
  {
    async updateEntries()
    {
      if (this.origHostname === null)
      {
        this.hostname = this.origHostname;
        this.pwdList = [];
        return;
      }

      let {hostname, entries} = await nativeRequest("get-entries", {
        keys: this.keys,
        hostname: this.origHostname
      });
      entries.sort(function(a, b)
      {
        if (a.title < b.title)
          return -1;
        if (b.title > a.title)
          return 1;
        return 0;
      });

      this.hostname = hostname;
      this.pwdList = entries;
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
      return new Promise(resolve =>
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
