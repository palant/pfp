<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="global-actions">
    <ImportAction />
    <IconicLink class="print" :title="$t('print')" @click="printPage" />
  </div>
</template>

<script>
"use strict";

import ImportAction from "./ImportAction.vue";

export default {
  name: "GlobalActions",
  localePath: "allpasswords/components/GlobalActions",
  components: {
    ImportAction
  },
  methods: {
    printPage()
    {
      window.print();
    }
  }
};
</script>
