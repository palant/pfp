<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <SettingPage />
</template>

<script>
"use strict";

import SettingPage from "../components/SettingsPage.vue";
import {initFontSize} from "../prefs.js";

export default {
  name: "App",
  components: {
    SettingPage
  },
  mounted()
  {
    initFontSize();
  }
};
</script>
