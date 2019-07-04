<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <div v-if="!browserSupported" class="warning">{{ $t("compat_message") }}</div>

    <template v-if="currentPage == 'panel'">
      <link rel="stylesheet" href="panel/panel.css">
      <panel-app />
    </template>
    <template v-if="currentPage == 'allpasswords'">
      <link rel="stylesheet" href="allpasswords/allpasswords.css">
      <allpasswords-app  />
    </template>
  </div>
</template>

<script>
"use strict";

import PanelApp from "../ui/panel/App.vue";
import AllPasswordsApp from "../ui/allpasswords/App.vue";

export default {
  name: "App",
  components: {
    "panel-app": PanelApp,
    "allpasswords-app": AllPasswordsApp
  },
  data()
  {
    return {
      browserSupported: true,
      currentPage: ""
    };
  },
  watch: {
    currentPage()
    {
      window.dispatchEvent(new CustomEvent("port-connected", {
        detail: this.currentPage
      }));
    }
  },
  mounted()
  {
    Promise.resolve().then(() =>
    {
      if (!"asdf".includes("d"))
        throw new Error("String.includes() returned unexpected result");

      if (![1,2,3,4].includes(3))
        throw new Error("Array.includes() returned unexpected result");

      if (new KeyboardEvent("keydown", {key: "Escape"}).key != "Escape")
        throw new Error("KeyboardEvent() returned unexpected result");

      return crypto.subtle.importKey(
        "raw",
        new Uint8Array(16),
        "AES-GCM",
        false,
        ["encrypt"]
      );
    }).catch(error =>
    {
      this.browserSupported = false;
      console.log(error);
    });

    window.addEventListener("show-panel", () =>
    {
      this.currentPage = "panel";
    });
    window.addEventListener("show-allpasswords", () =>
    {
      this.currentPage = "allpasswords";
    });
    this.currentPage = "panel";

    document.getElementById("loading").remove();
  }
};
</script>
