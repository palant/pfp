<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <div class="password-container">
      <IconicLink
        class="password-menu-link iconic-link"
        :class="{menuactive: modal == 'menu'}"
        :title="$t('password_menu')" @click="modal = 'menu'"
      />
      <IconicLink
        v-if="!$isWebClient" v-focus="focus"
        class="to-document-link iconic-link"
        :title="$t('.(PasswordMenu)to_document')" @click="fillIn"
      />
      <IconicLink
        v-focus="$isWebClient && focus"
        class="to-clipboard-link iconic-link"
        :title="$t('.(PasswordMenu)to_clipboard')" @click="copy"
      />
      <span class="password-title" :title="tooltip">
        {{ password.title }}
      </span>
    </div>

    <PasswordMenu
      v-if="modal == 'menu'" :password="password"
      @cancel="modal = null"
    />
    <QRCode
      v-if="modal == 'qrcode'" :password="password"
      @cancel="modal = null"
    />
    <EntryEditor
      v-if="modal == 'editor'" :password="password"
      @cancel="modal = null"
    />
    <NotesEditor
      v-if="modal == 'notes'" :password="password"
      @cancel="modal = null"
    />
  </div>
</template>

<script>
"use strict";

import browser from "../../browserAPI.js";
import {set as clipboardSet} from "../../clipboard.js";
import {normalizeHostname, getHostname, handleErrors} from "../../common.js";
import {port} from "../../../lib/messaging.js";
import {nativeRequest} from "../../protocol.js";
import EntryEditor from "./EntryEditor.vue";
import NotesEditor from "./NotesEditor.vue";
import QRCode from "./QRCode.vue";
import PasswordMenu from "./PasswordMenu.vue";

export default {
  name: "PasswordEntry",
  localePath: "panel/components/PasswordEntry",
  components: {
    EntryEditor,
    NotesEditor,
    QRCode,
    PasswordMenu
  },
  props: {
    password: {
      type: Object,
      required: true
    },
    focus: {
      type: Boolean,
      default: false
    }
  },
  data()
  {
    return {
      passwordOptions: null,
      modal: null
    };
  },
  computed: {
    tooltip()
    {
      let password = this.password;
      let tooltip = this.$t("password_username") + " " + password.username;
      if (password.tags && password.tags.length)
        tooltip += "\n" + this.$t("tags") + " " + password.tags.join(", ");
      if (password.notes)
        tooltip += "\n" + this.$t("notes") + " " + password.notes;

      return tooltip;
    }
  },
  methods: {
    async fillIn()
    {
      try
      {
        this.modal = null;

        let tabs = await browser.tabs.query({
          lastFocusedWindow: true,
          active: true
        });
        let tab = tabs[0] || {};
        let currentHost = getHostname(tab.url);
        if (normalizeHostname(currentHost) !== this.$root.origHostname)
          throw "wrong_site";

        await new Promise((resolve, reject) =>
        {
          let scriptID = Math.random();

          port.on("fillIn-done", function doneHandler({scriptID: source, result})
          {
            if (source != scriptID)
              return;

            port.off("done", doneHandler);
            if (result)
              reject(result);
            else
              resolve();
          });

          browser.scripting.executeScript({
            target: {tabId: tab.id},
            func: args => window._parameters = args,
            args: [{
              scriptID,
              hostname: currentHost,
              username: this.password.username,
              password: this.password.password
            }]
          }).catch(reject);

          browser.scripting.executeScript({
            target: {tabId: tab.id},
            files: ["contentScript/fillIn.js"]
          }).catch(reject);
        });

        window.close();
      }
      catch (error)
      {
        this.$parent.showPasswordMessage(error);
      }
    },
    copy()
    {
      this.modal = null;

      clipboardSet(this.password.password);
      this.$parent.showPasswordMessage("password_copied");
    },
    copyUsername()
    {
      this.modal = null;
      clipboardSet(this.password.username);
      this.$parent.showPasswordMessage("username_copied");
    },
    editEntry()
    {
      this.modal = "editor";
    },
    showQRCode()
    {
      this.modal = "qrcode";
    },
    showNotes()
    {
      this.modal = "notes";
    },
    async duplicate()
    {
      this.modal = null;
      try
      {
        await nativeRequest("duplicate-entry", {
          keys: this.$root.keys,
          uuid: this.password.uuid
        });
        await this.$root.updateEntries();
      }
      catch (error)
      {
        this.$parent.showPasswordMessage(error);
      }
    },
    removePassword: handleErrors(async function()
    {
      this.modal = null;
      let message = this.$t("remove_confirmation", this.password.title, this.$root.siteDisplayName);
      if (this.password.notes)
        message += " " + this.$t("remove_confirmation_notes", this.password.notes);
      if (await this.$root.confirm(message))
      {
        try
        {
          await nativeRequest("remove-entry", {
            keys: this.$root.keys,
            uuid: this.password.uuid
          });
          await this.$root.updateEntries();
        }
        catch (error)
        {
          this.$parent.showPasswordMessage(error);
        }
      }
    })
  }
};
</script>
