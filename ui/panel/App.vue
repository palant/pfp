<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <confirm ref="confirm" />
    <unknown-error v-if="unknownError" :error="unknownError" />

    <change-master v-if="masterPasswordState == 'unset' || (masterPasswordState == 'set' && resettingMaster)" />
    <enter-master v-else-if="masterPasswordState == 'set'" />
    <migration v-else-if="masterPasswordState == 'migrating'" />
    <template v-else-if="masterPasswordState == 'known'">
      <password-list v-if="currentPage == 'password-list'" />
      <sync v-else-if="currentPage == 'sync'" />
    </template>
  </div>
</template>

<script>
"use strict";

import {getSiteDisplayName} from "../common";
import {port} from "../messaging";
import EnterMaster from "./pages/EnterMaster.vue";
import ChangeMaster from "./pages/ChangeMaster.vue";
import Migration from "./pages/Migration.vue";
import PasswordList from "./pages/PasswordList.vue";
import Sync from "./pages/Sync.vue";
import Confirm from "../components/Confirm.vue";
import UnknownError from "../components/UnknownError.vue";

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
  components: {
    "change-master": ChangeMaster,
    "enter-master": EnterMaster,
    "migration": Migration,
    "password-list": PasswordList,
    "sync": Sync,
    "confirm": Confirm,
    "unknown-error": UnknownError
  },
  data()
  {
    return Object.assign({
      unknownError: null,
      resettingMaster: false,
      currentPage: "password-list"
    }, initialData);
  },
  computed: {
    siteDisplayName()
    {
      return getSiteDisplayName(this.site);
    }
  },
  created: function()
  {
    app = this;
  },
  methods:
  {
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
    }
  }
};
</script>
