<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <div class="password-list-header">
      <label for="password-list-site">{{ $t("site") }}</label>
      <div class="password-list-site-container">
        <a v-focus class="select-site" href="#" :title="$t('select_site_label')"
           @click.prevent="selectSite"
        />
        <div id="password-list-site" :class="{ 'special-site': $app.site != $app.siteDisplayName }">
          {{ $app.siteDisplayName }}
        </div>
      </div>
      <span v-if="$app.origSite != $app.site" class="alias-container">
        {{ $t("alias_description", $app.origSite) }}
        <a href="#" @click.prevent="removeAlias">
          {{ $t("remove_alias") }}
        </a>
      </span>
      <a v-else-if="$app.site && $app.site != 'pfp.invalid' && !$app.pwdList.length"
         class="alias-container" href="#" @click.prevent="addAlias"
      >
        {{ $t("add_alias") }}
      </a>
    </div>
    <site-selection v-if="modal == 'site-selection'"
                    :message="selectionMessage" :callback="selectionCallback"
                    @cancel="modal = null"
    />

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
    <div v-if="!$app.pwdList.length">{{ $t("no_passwords_message") }}</div>
    <div v-else class="password-list-container">
      <password-entry v-for="password in $app.pwdList"
                      :key="password.name + '\0' + password.revision"
                      :password="password"
      />
    </div>

    <a v-if="$app.site" class="add-password-link" href="#" @click.prevent="modal = 'generated'">
      {{ $t("generate_password_link") }}
    </a>
    <generated-password v-if="modal == 'generated'" @cancel="modal = null" />

    <a v-if="$app.site" class="add-password-link" href="#" @click.prevent="modal = 'stored'">
      {{ $t("stored_password_link") }}
    </a>
    <stored-password v-if="modal == 'stored'" @cancel="modal = null" />

    <div class="link-container">
      <a href="#" @click.prevent="showAll">
        {{ $t("show_all_passwords") }}
      </a>
      <a href="#" class="sync-state-link" :class="{failed: $app.sync.error && $app.sync.error != 'sync_connection_error'}" @click.prevent="showSync">
        <template v-if="$app.sync.provider">
          {{ $t("sync_state") }}
        </template>
        <template v-else>
          {{ $t("sync_setup") }}
        </template>
      </a>
      <a v-cancel href="#" @click.prevent="lockPasswords">
        {{ $t("lock_passwords") }}
      </a>
    </div>
  </div>
</template>

<script>
"use strict";

import {passwords, masterPassword, passwordRetrieval, ui} from "../../proxy";
import GeneratedPassword from "../components/GeneratedPassword.vue";
import PasswordEntry from "../components/PasswordEntry.vue";
import PasswordMessage from "../components/PasswordMessage.vue";
import SiteSelection from "../components/SiteSelection.vue";
import StoredPassword from "../components/StoredPassword.vue";

export default {
  name: "PasswordList",
  components: {
    "generated-password": GeneratedPassword,
    "password-entry": PasswordEntry,
    "password-message": PasswordMessage,
    "site-selection": SiteSelection,
    "stored-password": StoredPassword
  },
  data: () =>
  {
    return {
      modal: null,
      selectionMessage: null,
      selectionCallback: null
    };
  },
  mounted()
  {
    if (!this.$app.site)
      this.selectSite();
  },
  methods: {
    showPasswordMessage(message)
    {
      this.$refs["password-message"].message = message;
    },
    selectSite()
    {
      this.selectionMessage = this.$t("select_site");
      this.selectionCallback = site =>
      {
        passwords.getPasswords(site)
          .then(([origSite, site, pwdList]) =>
          {
            this.$app.origSite = origSite;
            this.$app.site = site;
            this.$app.pwdList = pwdList;
          })
          .catch(this.$app.showUnknownError);
      };
      this.modal = "site-selection";
    },
    addAlias()
    {
      this.selectionMessage = this.$t("select_alias", this.$app.origSite);
      this.selectionCallback = site =>
      {
        if (site == this.$app.origSite)
          return;

        passwords.addAlias(this.$app.origSite, site)
          .then(() => passwords.getPasswords(this.$app.origSite))
          .then(([origSite, site, pwdList]) =>
          {
            this.$app.origSite = origSite;
            this.$app.site = site;
            this.$app.pwdList = pwdList;
          })
          .catch(this.$app.showUnknownError);
      };
      this.modal = "site-selection";
    },
    removeAlias()
    {
      let message = this.$t("remove_alias_confirmation", this.$app.origSite, this.$app.siteDisplayName);
      this.$app.confirm(message).then(response =>
      {
        if (response)
        {
          passwords.removeAlias(this.$app.origSite)
            .then(() => passwords.getPasswords(this.$app.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              this.$app.origSite = origSite;
              this.$app.site = site;
              this.$app.pwdList = pwdList;
            })
            .catch(this.$app.showUnknownError);
        }
      });
    },
    showAll()
    {
      ui.showAllPasswords()
        .then(() => window.close())
        .catch(this.$app.showUnknownError);
    },
    showSync()
    {
      this.$app.currentPage = "sync";
    },
    lockPasswords()
    {
      masterPassword.forgetPassword()
        .then(() => this.$app.masterPasswordState = "set")
        .catch(this.$app.showUnknownError);
    }
  }
};
</script>
