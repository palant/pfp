<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <Setting name="autolock" :def-value="true" :focus="true" />
    <Setting name="autolock_delay" :def-value="10" />
  </div>
</template>

<script>
"use strict";

import Setting from "../components/Setting.vue";

export default {
  name: "App",
  components: {
    Setting
  }
};
</script>
