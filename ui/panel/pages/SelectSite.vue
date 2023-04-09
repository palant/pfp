<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <SiteSelection :message="$t('label')" :callback="selected" />
  </div>
</template>

<script>
"use strict";

import {handleErrors} from "../../common.js";
import SiteSelection from "../components/SiteSelection.vue";

export default {
  name: "SelectSite",
  localePath: "panel/pages/SelectSite",
  components: {
    SiteSelection
  },
  emits: ["selected"],
  methods: {
    selected: handleErrors(async function(site)
    {
      this.$root.origHostname = site;
      await this.$root.updateEntries();
      this.$emit("selected");
    })
  }
};
</script>
