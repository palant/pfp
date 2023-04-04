<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <template v-if="$root.site == $root.siteDisplayName">
      <label for="site">{{ $t("site") }}</label>
      <ExternalLink
        id="site" v-focus="!$root.pwdList.length"
        type="url" :param="'https://' + $root.site" data-noaccesskey
      >
        {{ $root.siteDisplayName }}
      </ExternalLink>
    </template>
    <template v-else>
      <div>{{ $t("site") }}</div>
      <div v-focus="!$root.pwdList.length" class="special-site" tabindex="0">
        {{ $root.siteDisplayName }}
      </div>
    </template>

    <div v-if="$root.origSite != $root.site" class="alias-container">
      {{ $t("alias_description", $root.origSite) }}
      <a href="#" @click.prevent="removeAlias">
        {{ $t("remove_alias") }}
      </a>
    </div>
    <a
      v-else-if="$root.site && $root.site != 'pfp.invalid' && !$root.pwdList.length"
      class="alias-container" href="#" @click.prevent="addAlias"
    >
      {{ $t("add_alias") }}
    </a>

    <ModalOverlay v-if="modal == 'site-selection'" :stretch="true" @cancel="modal = null">
      <SiteSelection :message="$t('select_alias', $root.origSite)" :callback="selectionCallback" />
    </ModalOverlay>

    <PasswordMessage
      ref="password-message" class="block-start"
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
    <div v-if="!$root.pwdList.length">{{ $t("no_passwords_message") }}</div>
    <div v-else class="password-list-container" role="list" @keydown="keyboardNavigation">
      <PasswordEntry
        v-for="(password, index) in $root.pwdList"
        :key="password.title"
        role="listitem" :password="password" :focus="index == 0"
      />
    </div>

    <a v-if="$root.site !== null" class="add-password-link" href="#" @click.prevent="modal = 'new-entry'">
      {{ $t("new_password_link") }}
    </a>
    <EntryEditor v-if="modal == 'new-entry'" @cancel="modal = null" />

    <div class="link-container">
      <a href="#" @click.prevent="showAll">
        {{ $t("show_all_passwords") }}
      </a>
    </div>
  </div>
</template>

<script>
"use strict";

import browser from "../../../lib/browserAPI.js";
import {keyboardNavigationType, handleErrors} from "../../common.js";
import {passwords, ui} from "../../proxy.js";
import PasswordMessage from "../../components/PasswordMessage.vue";
import PasswordEntry from "../components/PasswordEntry.vue";
import SiteSelection from "../components/SiteSelection.vue";
import EntryEditor from "../components/EntryEditor.vue";

export default {
  name: "PasswordList",
  localePath: "panel/pages/PasswordList",
  components: {
    PasswordMessage,
    PasswordEntry,
    SiteSelection,
    EntryEditor
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
        if (site == this.$root.origSite)
          return;

        passwords.addAlias(this.$root.origSite, site)
          .then(() => passwords.getPasswords(this.$root.origSite))
          .then(([origSite, site, pwdList]) =>
          {
            this.$root.origSite = origSite;
            this.$root.site = site;
            this.$root.pwdList = pwdList;
          })
          .catch(this.$root.showUnknownError);
      };
      this.modal = "site-selection";
    },
    removeAlias()
    {
      let message = this.$t("remove_alias_confirmation", this.$root.origSite, this.$root.siteDisplayName);
      this.$root.confirm(message).then(response =>
      {
        if (response)
        {
          passwords.removeAlias(this.$root.origSite)
            .then(() => passwords.getPasswords(this.$root.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              this.$root.origSite = origSite;
              this.$root.site = site;
              this.$root.pwdList = pwdList;
            })
            .catch(this.$root.showUnknownError);
        }
      });
    },
    showAll: handleErrors(async function()
    {
      let url = browser.runtime.getURL("ui/allpasswords/allpasswords.html");

      // Only look for existing tab in the active window, don't activate
      // background windows to avoid unexpected effects.
      let tabs = await browser.tabs.query({
        url,
        lastFocusedWindow: true
      });

      if (tabs.length)
        await browser.tabs.update(tabs[0].id, {active: true});
      else
      {
        await browser.tabs.create({
          url,
          active: true
        });
      }
      window.close();
    })
  }
};
</script>
