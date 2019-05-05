<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="migration page">
    <h1>{{ $t("migration_title") }}</h1>
    <div v-if="inProgress" class="migration-in-progress">
      <div class="migration-spinning-wheel" />
      <div>{{ $t("migration_in_progress") }}</div>
    </div>
    <p>{{ $t("migration_features_intro") }}</p>
    <ul>
      <li>{{ $t("migration_feature1") }}</li>
      <li>{{ $t("migration_feature2") }}</li>
      <li>{{ $t("migration_feature3") }}</li>
    </ul>
    <p>{{ $t("migration_todos_intro") }}</p>
    <ul>
      <li>{{ $t("migration_todo1") }}</li>
      <li>{{ $t("migration_todo2") }}</li>
    </ul>
    <p>
      <external-link type="relnotes" param="2.0.0">
        {{ $t("learn_more") }}
      </external-link>
    </p>
    <div v-if="!inProgress" class="button-container">
      <button v-focus @click="done">{{ $t("migration_continue") }}</button>
    </div>
  </div>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";
import {app, showUnknownError} from "../App.vue";

export default {
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
      if (app.masterPasswordState != "migrating")
      {
        this.migrated();
        return;
      }

      passwords.isMigrating().then(migrating =>
      {
        if (!migrating)
          this.migrated();
      }).catch(showUnknownError);
    },
    migrated()
    {
      window.clearTimeout(this.timeout);
      this.timeout = null;
      this.inProgress = false;
    },
    done()
    {
      passwords.getPasswords(app.origSite)
        .then(([origSite, site, pwdList]) =>
        {
          app.origSite = origSite;
          app.site = site;
          app.pwdList = pwdList;
          app.masterPasswordState = "known";
        }).catch(showUnknownError);
    }
  }
};
</script>
