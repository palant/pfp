<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <div class="password-list-header">
      <label for="site">{{ $t("site") }}</label>
      <external-link v-if="$app.site == $app.siteDisplayName" id="site" v-focus
                     type="url" :param="'https://' + $app.site"
      >
        {{ $app.siteDisplayName }}
      </external-link>
      <span v-else v-focus class="special-site" tabindex="0">
        {{ $app.siteDisplayName }}
      </span>

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

    <modal-overlay v-if="modal == 'site-selection'" :stretch="true" @cancel="modal = null">
      <site-selection :message="$t('select_alias', $app.origSite)" :callback="selectionCallback" />
    </modal-overlay>

    <password-message ref="password-message"
                      :messages="{
                        password_ready_message: false,
                        password_copied_message: true,
                        username_copied_message: true,
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
    </div>
  </div>
</template>

<script>
"use strict";

import {passwords, passwordRetrieval, ui} from "../../proxy";
import PasswordMessage from "../../components/PasswordMessage.vue";
import GeneratedPassword from "../components/GeneratedPassword.vue";
import PasswordEntry from "../components/PasswordEntry.vue";
import SiteSelection from "../components/SiteSelection.vue";
import StoredPassword from "../components/StoredPassword.vue";

export default {
  name: "PasswordList",
  components: {
    "password-message": PasswordMessage,
    "generated-password": GeneratedPassword,
    "password-entry": PasswordEntry,
    "site-selection": SiteSelection,
    "stored-password": StoredPassword
  },
  data: () =>
  {
    return {
      modal: null,
      selectionCallback: null
    };
  },
  methods: {
    showPasswordMessage(message)
    {
      this.$refs["password-message"].message = message;
    },
    addAlias()
    {
      this.selectionCallback = site =>
      {
        this.modal = null;
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
    }
  }
};
</script>
