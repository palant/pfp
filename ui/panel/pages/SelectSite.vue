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

import {passwords} from "../../proxy.js";
import SiteSelection from "../components/SiteSelection.vue";

export default {
  name: "SelectSite",
  localePath: "panel/pages/SelectSite",
  components: {
    SiteSelection
  },
  emits: ["selected"],
  methods: {
    async selected(site)
    {
      try
      {
        let entries = await this.$root.getEntries(site);
        this.$root.site = site;
        this.$root.pwdList = entries;
        this.$emit("selected");
      }
      catch (error)
      {
        this.$root.showUnknownError(error);
      }
    }
  }
};
</script>
