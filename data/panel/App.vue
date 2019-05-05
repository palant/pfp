<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div id="app">
    <confirm ref="confirm" />

    <div
      v-if="unknownError"
      id="unknown-error"
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
        id="unknown-error-details"
      >{{ unknownError }}</div>
    </div>

    <router-view />
  </div>
</template>

<script>
"use strict";

import {port} from "../messaging";
import router from "./router";
import Confirm from "./components/Confirm.vue";

const stateToRoute = {
  "unset": ["/change-master"],
  "set": ["/enter-master", "/change-master"],
  "migrating": ["/migration"],
  "known": ["/password-list", "/generate-password", "/stored-password", "/recovery-code", "/qrcode", "/sync-setup", "/sync-state", "/confirm"]
};

let data = {
  site: null,
  origSite: null,
  pwdList: null,
  masterPasswordState: null,
  sync: null,
  unknownError: null,
  unknownErrorDetails: false
};

export let app = null;

export function confirm(message)
{
  return new Promise((resolve, reject) =>
  {
    let confirm = app.$refs.confirm;
    confirm.message = message;
    confirm.callback = resolve;
  });
}

export function showUnknownError(error)
{
  app.unknownError = error;
}

port.on("init", state =>
{
  let target = app || data;
  for (let key of ["site", "origSite", "pwdList", "masterPasswordState", "sync"])
    if (key in state)
      target[key] = state[key];
});

export default {
  name: "App",
  components: {
    confirm: Confirm
  },
  data: () => data,
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
      if (routes.indexOf(router.currentRoute.path) < 0)
      {
        let route = routes[0];
        if (route == "/password-list" && !this.site)
          route = "/site-selection";
        router.push(route);
      }
    }
  },
  created: function()
  {
    app = this;
  }
};
</script>
