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

import {passwords} from "../../proxy";
import SiteSelection from "../components/SiteSelection.vue";

export default {
  name: "SelectSite",
  components: {
    "site-selection": SiteSelection
  },
  methods: {
    selected(site)
    {
      passwords.getPasswords(site)
        .then(([origSite, site, pwdList]) =>
        {
          this.$app.origSite = origSite;
          this.$app.site = site;
          this.$app.pwdList = pwdList;
          this.$emit("selected");
        })
        .catch(this.$app.showUnknownError);
    }
  }
};
</script>
