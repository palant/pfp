<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <site-selection :message="$t('label')" :callback="selected" />
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
    "site-selection": SiteSelection
  },
  emits: ["selected"],
  methods: {
    selected(site)
    {
      passwords.getPasswords(site)
        .then(([origSite, site, pwdList]) =>
        {
          this.$root.origSite = origSite;
          this.$root.site = site;
          this.$root.pwdList = pwdList;
          this.$emit("selected");
        })
        .catch(this.$root.showUnknownError);
    }
  }
};
</script>
