<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div>
    <div class="password-container">
      <a href="#" class="password-menu-link iconic-link" :class="{menuactive: modal == 'menu'}" :title="$t('password_menu')" @click.prevent="modal = 'menu'" />
      <a v-if="!$isWebClient" href="#" class="to-document-link iconic-link" :title="$t('to_document')" @click.prevent="fillIn" />
      <a href="#" class="to-clipboard-link iconic-link" :title="$t('to_clipboard')" @click.prevent="copy" />
      <span class="user-name-container" :class="{'legacy-warning': password.type == 'generated'}" :title="tooltip" @click.self="upgradePassword">
        <span>{{ password.name }}</span>
        <span v-if="password.revision" class="password-revision">{{ password.revision }}</span>
      </span>
    </div>

    <generated-password v-if="modal == 'generated'" :password="password"
                        :options="passwordOptions" @cancel="modal = null"
    />
    <password-menu v-if="modal == 'menu'" :password="password"
                   @cancel="modal = null"
    />
    <qr-code v-if="modal == 'qrcode'" :password="password" :value="value"
             @cancel="modal = null"
    />
    <notes-editor v-if="modal == 'notes'" :password="password"
                  @cancel="modal = null"
    />
  </div>
</template>

<script>
"use strict";

import {set as clipboardSet} from "../../clipboard";
import {passwords, passwordRetrieval} from "../../proxy";
import GeneratedPassword from "./GeneratedPassword.vue";
import NotesEditor from "./NotesEditor.vue";
import QRCode from "./QRCode.vue";
import PasswordMenu from "./PasswordMenu.vue";

export default {
  components: {
    "generated-password": GeneratedPassword,
    "notes-editor": NotesEditor,
    "qr-code": QRCode,
    "password-menu": PasswordMenu
  },
  props: {
    password: {
      type: Object,
      required: true
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
      let tooltip = "";
      let password = this.password;
      if (password.type == "generated2" || password.type == "generated")
      {
        tooltip = this.$t("password_type_" + password.type);
        if (password.type == "generated")
          tooltip += "\n" + this.$t("password_type_generated_replace");

        tooltip += "\n" + this.$t("password_length");
        tooltip += " " + password.length;

        tooltip += "\n" + this.$t("allowed_characters");
        if (password.lower)
          tooltip += " " + "abc";
        if (password.upper)
          tooltip += " " + "XYZ";
        if (password.number)
          tooltip += " " + "789";
        if (password.symbol)
          tooltip += " " + "+^;";
      }
      else if (password.type == "stored")
        tooltip = this.$t("password_type_stored");

      if (password.notes)
        tooltip += "\n" + this.$t("password_info_notes") + " " + password.notes;

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
    ensureValue()
    {
      if (this.value)
        return Promise.resolve();

      return passwords.getPassword(this.password)
        .then(value =>
        {
          this.value = value;
        });
    },
    fillIn()
    {
      this.modal = null;
      passwordRetrieval.fillIn(this.password)
        .then(() => window.close())
        .catch(error => this.$parent.showPasswordMessage(error));
    },
    copy()
    {
      this.modal = null;

      let doCopy = () =>
      {
        clipboardSet(this.value);
        this.$parent.showPasswordMessage("password_copied_message");
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
            this.$parent.showPasswordMessage("password_ready_message");
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
    upgradePassword()
    {
      this.modal = null;
      if (this.password.type != "generated")
        return;

      let message = this.$t("upgrade_password_confirmation", this.password.name, this.$app.siteDisplayName);
      this.$app.confirm(message).then(response =>
      {
        if (response)
        {
          passwords.addGenerated({
            site: this.password.site,
            name: this.password.name,
            revision: this.password.revision,
            length: this.password.length,
            lower: this.password.lower,
            upper: this.password.upper,
            number: this.password.number,
            symbol: this.password.symbol,
            notes: this.password.notes,
            legacy: false
          }, true)
            .then(pwdList => this.$app.pwdList = pwdList)
            .catch(error => this.$parent.showPasswordMessage(error));
        }
      });
    },
    makeGenerated()
    {
      this.passwordOptions = {replacing: true};
      this.modal = "generated";
    },
    bumpRevision()
    {
      this.passwordOptions = {incRevision: true};
      this.modal = "generated";
    },
    removePassword()
    {
      this.modal = null;
      let message = this.$t("remove_password_confirmation", this.password.name, this.$app.siteDisplayName);
      this.$app.confirm(message).then(response =>
      {
        if (response)
        {
          passwords.removePassword(this.password)
            .then(pwdList => this.$app.pwdList = pwdList)
            .catch(this.$parent.showPasswordMessage);
        }
      });
    }
  }
};
</script>
