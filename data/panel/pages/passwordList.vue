<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <div id="password-list-header">
      <label for="password-list-site">{{ $t("site") }}</label>
      <div id="password-list-site-container">
        <a id="select-site" v-focus href="#" :title="$t('select_site_label')"
           @click.prevent="selectSite"
        />
        <div id="password-list-site" :class="{ 'special-site': app.site != app.siteDisplayName }">
          {{ app.siteDisplayName }}
        </div>
      </div>
      <span v-if="app.origSite != app.site" id="alias-container">
        {{ $t("alias_description", app.origSite) }}
        <a id="remove-alias" href="#" @click.prevent="removeAlias">
          {{ $t("remove_alias") }}
        </a>
      </span>
      <a v-else-if="app.site && app.site != 'pfp.invalid' && !app.pwdList.length"
         id="add-alias" href="#" @click.prevent="addAlias"
      >
        {{ $t("add_alias") }}
      </a>
    </div>

    <password-message ref="password-message"
                      :messages="{
                        password_ready_message: false,
                        password_copied_message: true,
                        no_such_password: false,
                        unknown_generation_method: false,
                        wrong_site_message: false,
                        no_password_fields: false
                      }"
    />

    <div class="block-start">{{ $t("passwords_label") }}</div>
    <div v-if="!app.pwdList.length">{{ $t("no_passwords_message") }}</div>
    <div v-else id="password-list-container">
      <password-entry v-for="password in app.pwdList"
                      :key="password.name + '\0' + password.revision"
                      :password="password"
      />
    </div>

    <a v-if="app.site" id="generate-password-link" href="#" @click.prevent="modal = 'generated'">
      {{ $t("generate_password_link") }}
    </a>
    <generated-password v-if="modal == 'generated'" @cancel="modal = null" />

    <a v-if="app.site" id="stored-password-link" href="#" @click.prevent="modal = 'stored'">
      {{ $t("stored_password_link") }}
    </a>
    <stored-password v-if="modal == 'stored'" @cancel="modal = null" />

    <div class="link-container">
      <a href="#" @click.prevent="showAll">
        {{ $t("show_all_passwords") }}
      </a>
      <a href="#" class="sync-state-link" :class="{failed: app.sync.error && app.sync.error != 'sync_connection_error'}" @click.prevent="showSync">
        <template v-if="app.sync.provider">
          {{ $t("sync_state") }}
        </template>
        <template v-else>
          {{ $t("sync_setup") }}
        </template>
      </a>
      <a id="lock-passwords" href="#" @click.prevent="lockPasswords">
        {{ $t("lock_passwords") }}
      </a>
    </div>
  </div>
</template>

<script>
"use strict";

import {passwords, masterPassword, passwordRetrieval, ui} from "../../proxy";
import {app, confirm, showUnknownError} from "../App.vue";
import GeneratedPassword from "../components/GeneratedPassword.vue";
import PasswordEntry from "../components/PasswordEntry.vue";
import PasswordMessage from "../components/PasswordMessage.vue";
import StoredPassword from "../components/StoredPassword.vue";

export default {
  components: {
    "generated-password": GeneratedPassword,
    "password-entry": PasswordEntry,
    "password-message": PasswordMessage,
    "stored-password": StoredPassword
  },
  data: () =>
  {
    return {
      modal: null
    };
  },
  computed: {
    app()
    {
      return app;
    }
  },
  methods: {
    showPasswordMessage(message)
    {
      this.$refs["password-message"].message = message;
    },
    selectSite()
    {
      this.$router.push("/site-selection");
    },
    addAlias()
    {
      this.$router.push({
        path: "/site-selection",
        query: {
          alias: 1
        }
      });
    },
    removeAlias()
    {
      let message = this.$t("remove_alias_confirmation", app.origSite, app.siteDisplayName);
      confirm(message).then(response =>
      {
        if (response)
        {
          passwords.removeAlias(app.origSite)
            .then(() => passwords.getPasswords(app.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              app.origSite = origSite;
              app.site = site;
              app.pwdList = pwdList;
            })
            .catch(showUnknownError);
        }
      });
    },
    showAll()
    {
      ui.showAllPasswords()
        .then(() => window.close())
        .catch(showUnknownError);
    },
    showSync()
    {
      this.$router.push("/sync");
    },
    lockPasswords()
    {
      masterPassword.forgetPassword()
        .then(() => app.masterPasswordState = "set")
        .catch(showUnknownError);
    }
  }
};
</script>
