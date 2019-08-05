<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <template v-if="$app.site == $app.siteDisplayName">
      <label for="site">{{ $t("site") }}</label>
      <external-link id="site" v-focus="!$app.pwdList.length"
                     type="url" :param="'https://' + $app.site" data-noaccesskey
      >
        {{ $app.siteDisplayName }}
      </external-link>
    </template>
    <template v-else>
      <div>{{ $t("site") }}</div>
      <div v-focus="!$app.pwdList.length" class="special-site" tabindex="0">
        {{ $app.siteDisplayName }}
      </div>
    </template>

    <div v-if="$app.origSite != $app.site" class="alias-container">
      {{ $t("alias_description", $app.origSite) }}
      <a href="#" @click.prevent="removeAlias">
        {{ $t("remove_alias") }}
      </a>
    </div>
    <a v-else-if="$app.site && $app.site != 'pfp.invalid' && !$app.pwdList.length"
       class="alias-container" href="#" @click.prevent="addAlias"
    >
      {{ $t("add_alias") }}
    </a>

    <modal-overlay v-if="modal == 'site-selection'" :stretch="true" @cancel="modal = null">
      <site-selection :message="$t('select_alias', $app.origSite)" :callback="selectionCallback" />
    </modal-overlay>

    <password-message ref="password-message" class="block-start"
                      :messages="{
                        password_ready: false,
                        password_copied: true,
                        username_copied: true,
                        no_such_password: false,
                        unknown_generation_method: false,
                        wrong_site: false,
                        no_password_fields: false
                      }"
    />

    <div class="block-start">{{ $t("passwords_label") }}</div>
    <div v-if="!$app.pwdList.length">{{ $t("no_passwords_message") }}</div>
    <div v-else class="password-list-container" role="list" @keydown="keyboardNavigation">
      <password-entry v-for="(password, index) in $app.pwdList"
                      :key="password.name + '\0' + password.revision"
                      role="listitem" :password="password" :focus="index == 0"
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

import {keyboardNavigationType} from "../../common";
import {passwords, passwordRetrieval, ui} from "../../proxy";
import PasswordMessage from "../../components/PasswordMessage.vue";
import GeneratedPassword from "../components/GeneratedPassword.vue";
import PasswordEntry from "../components/PasswordEntry.vue";
import SiteSelection from "../components/SiteSelection.vue";
import StoredPassword from "../components/StoredPassword.vue";

export default {
  name: "PasswordList",
  localePath: "panel/pages/PasswordList",
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
    keyboardNavigation(event)
    {
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
        return;

      let type = keyboardNavigationType(event);
      if (!type)
        return;

      let current = document.activeElement;
      if (!current.parentNode.classList.contains("password-container"))
        return;

      let container = current.parentNode;
      let elements = container.getElementsByClassName("iconic-link");
      let index = [].indexOf.call(elements, current);
      if (index < 0)
        return;

      event.preventDefault();
      if (type.endsWith("inrow"))
      {
        if (type == "backinrow" && index - 1 >= 0)
          elements[index - 1].focus();
        else if (type == "forwardinrow" && index + 1 < elements.length)
          elements[index + 1].focus();
        else if (type == "startinrow")
          elements[0].focus();
        else if (type == "endinrow")
          elements[elements.length - 1].focus();
      }
      else
      {
        let containers = this.$el.getElementsByClassName("password-container");
        let containerIndex = [].indexOf.call(containers, container);
        if (type == "back" && containerIndex - 1 >= 0)
          containers[containerIndex - 1].getElementsByClassName("iconic-link")[index].focus();
        else if (type == "forward" && containerIndex + 1 < containers.length)
          containers[containerIndex + 1].getElementsByClassName("iconic-link")[index].focus();
        else if (type == "start")
          containers[0].getElementsByClassName("iconic-link")[index].focus();
        else if (type == "end")
          containers[containers.length - 1].getElementsByClassName("iconic-link")[index].focus();
      }
    },
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
