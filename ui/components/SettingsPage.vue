<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <Setting name="autolock" :def-value="true" :focus="true" @modified="resetAutolock" />
    <Setting name="autolock_delay" :def-value="10" :min-value="1" @modified="resetAutolock" />
  </div>
</template>

<script>
"use strict";

import Setting from "./Setting.vue";
import {resetAutolock} from "../keys.js";

export default {
  name: "SettingsPage",
  components: {
    Setting
  },
  methods: {
    resetAutolock
  }
};
</script>
