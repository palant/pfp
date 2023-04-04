<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <EnterMasterShared class="page" :cancelable="false" @done="done">
    <div class="link-container">
      <a href="#" @click.prevent="$root.resettingMaster = true">
        {{ $t("reset") }}
      </a>
    </div>
  </EnterMasterShared>
</template>

<script>
"use strict";

import EnterMasterShared from "../../components/EnterMasterShared.vue";

export default {
  name: "EnterMaster",
  localePath: "panel/pages/EnterMaster",
  components: {
    EnterMasterShared
  }
};
</script>
