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
      v-if="modal == 'qrcode'" :password="password" :value="value"
      @cancel="modal = null"
    />
    <EntryEditor
      v-if="modal == 'editor'" :password="password" :value="value"
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

import browser from "../../../lib/browserAPI.js";
import {set as clipboardSet} from "../../clipboard.js";
import {normalizeHostname, handleErrors, getCurrentHost} from "../../common.js";
import {getPort} from "../../../lib/messaging.js";
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
      value: null,
      passwordOptions: null,
      modal: null
    };
  },
  computed: {
    tooltip()
    {
      let password = this.password;
      let tooltip = this.$t("password_username") + " " + password.username;
      if (password.notes)
        tooltip += "\n" + this.$t("notes") + " " + password.notes;

      return tooltip;
    }
  },
  watch: {
    password()
    {
      this.value = null;
    }
  },
  methods: {
    ensureValue: handleErrors(async function()
    {
      if (this.value)
        return;

      this.value = await nativeRequest("get-password", {
        keys: this.$root.keys,
        uuid: this.password.uuid
      });
    }),
    async fillIn()
    {
      try
      {
        this.modal = null;

        await this.ensureValue();

        let currentHost = await getCurrentHost();
        if (normalizeHostname(currentHost) !== this.$root.site)
          throw "wrong_site";

        await new Promise((resolve, reject) =>
        {
          let scriptID = Math.random();
          let port = getPort("contentScript");

          port.on("done", function doneHandler({scriptID: source, result})
          {
            if (source != scriptID)
              return;

            port.off("done", doneHandler);
            if (result)
              reject(result);
            else
              resolve();
          });

          browser.tabs.executeScript({
            code: "var _parameters = " + JSON.stringify({
              scriptID,
              hostname: currentHost,
              username: this.password.username,
              password: this.value
            })
          }).catch(reject);

          browser.tabs.executeScript({file: "contentScript/fillIn.js"}).catch(reject);
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

      let doCopy = () =>
      {
        clipboardSet(this.value);
        this.$parent.showPasswordMessage("password_copied");
      };

      if (this.value)
        doCopy();
      else
      {
        this.ensureValue().then(() =>
        {
          if (!this.$isWebClient)
            doCopy();
          else
          {
            this.$parent.showPasswordMessage("password_ready");
            let handler = event =>
            {
              window.removeEventListener("click", handler, true);
              event.stopPropagation();
              event.preventDefault();
              doCopy();
            };
            window.addEventListener("click", handler, true);
          }
        }).catch(error => this.$parent.showPasswordMessage(error));
      }
    },
    copyUsername()
    {
      this.modal = null;
      clipboardSet(this.password.username);
      this.$parent.showPasswordMessage("username_copied");
    },
    async editEntry()
    {
      try
      {
        this.modal = null;
        await this.ensureValue();
        this.modal = "editor";
      }
      catch (error)
      {
        this.$parent.showPasswordMessage(error);
      }
    },
    showQRCode()
    {
      this.modal = null;
      this.ensureValue().then(() =>
      {
        this.modal = "qrcode";
      }).catch(error => this.$parent.showPasswordMessage(error));
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
        this.$root.pwdList = await this.$root.getEntries(this.$root.site);
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
          this.$root.pwdList = await this.$root.getEntries(this.$root.site);
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
