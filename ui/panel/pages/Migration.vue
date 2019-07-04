<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="migration page">
    <h1>{{ $t("title") }}</h1>
    <div v-if="inProgress" class="migration-in-progress">
      <div class="migration-spinning-wheel" />
      <div>{{ $t("in_progress") }}</div>
    </div>
    <p>{{ $t("intro") }}</p>
    <ul>
      <li>{{ $t("change1") }}</li>
      <li>{{ $t("change2") }}</li>
    </ul>
    <p>{{ $t("conclusion") }}</p>
    <p>
      <external-link type="relnotes" param="2.2.0">
        {{ $t(".learn_more") }}
      </external-link>
    </p>
    <div v-if="!inProgress" class="button-container">
      <button v-focus @click="done">{{ $t("continue") }}</button>
    </div>
  </div>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";

export default {
  name: "Migration",
  data()
  {
    return {
      inProgress: true,
      timeout: null
    };
  },
  mounted()
  {
    this.timeout = window.setInterval(this.checkStatus, 100);
  },
  methods: {
    checkStatus()
    {
      if (this.$app.masterPasswordState != "migrating")
      {
        this.migrated();
        return;
      }

      passwords.isMigrating().then(migrating =>
      {
        if (!migrating)
          this.migrated();
      }).catch(this.$app.showUnknownError);
    },
    migrated()
    {
      window.clearTimeout(this.timeout);
      this.timeout = null;
      this.inProgress = false;
    },
    done()
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
};
</script>
