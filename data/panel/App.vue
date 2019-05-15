<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <confirm ref="confirm" />

    <div
      v-if="unknownError"
      class="warning"
    >
      <span>{{ $t("unknown_error") }}</span>
      <a
        v-if="!unknownErrorDetails"
        href="#"
        @click.prevent="unknownErrorDetails = true"
      >
        {{ $t("unknown_error_more") }}
      </a>
      <div
        v-else
        class="unknown-error-details"
      >{{ unknownError }}</div>
    </div>

    <router-view />
  </div>
</template>

<script>
"use strict";

import {port} from "../messaging";
import Confirm from "./components/Confirm.vue";

const stateToRoute = {
  "unset": ["/change-master"],
  "set": ["/enter-master", "/change-master"],
  "migrating": ["/migration"],
  "known": ["/password-list", "/generate-password", "/stored-password", "/recovery-code", "/qrcode", "/sync-setup", "/sync-state", "/confirm"]
};

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
    confirm: Confirm
  },
  data()
  {
    return Object.assign({
      unknownError: null,
      unknownErrorDetails: false
    }, initialData);
  },
  computed: {
    siteDisplayName()
    {
      return require("../common").getSiteDisplayName(this.site);
    }
  },
  watch: {
    masterPasswordState: function()
    {
      let routes = stateToRoute[this.masterPasswordState];
      if (routes.indexOf(this.$router.currentRoute.path) < 0)
        this.$router.push(routes[0]);
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
