<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <enter-master class="page" :cancelable="false" @done="done">
      <div class="link-container">
        <a href="#" @click.prevent="$app.resettingMaster = true">
          {{ $t("reset") }}
        </a>
      </div>
    </enter-master>
  </div>
</template>

<script>
"use strict";

import EnterMaster from "../../components/EnterMaster.vue";
import {passwords} from "../../proxy";

export default {
  name: "EnterMaster",
  components: {
    "enter-master": EnterMaster
  },
  methods: {
    done(success)
    {
      if (!success)
        return;

      if (success == "migrating")
        this.$app.masterPasswordState = "migrating";
      else
      {
        passwords.getPasswords(this.$app.origSite)
          .then(([origSite, site, pwdList]) =>
          {
            this.$app.origSite = origSite;
            this.$app.site = site;
            this.$app.pwdList = pwdList;
            this.$app.masterPasswordState = "known";
          }).catch(this.$app.showUnknownError);
      }
    }
  }
};
</script>
