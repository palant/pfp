<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="password-info-container">
    <password-message ref="password-message"
                      :messages="{
                        password_ready: false,
                        password_copied: true,
                        no_such_password: false,
                        unknown_generation_method: false
                      }"
    />

    <div class="password-container">
      <a ref="to-clipboard" href="#" class="to-clipboard-link" :title="$t('/(panel)(components)(PasswordMenu)to_clipboard')" @click.prevent="copy" />
      <span class="user-name-container">
        <span class="user-name">{{ password.name }}</span>
        <span v-if="password.revision" class="password-revision">{{ password.revision }}</span>
      </span>
      <span v-if="showPasswords && value" class="password-value">{{ value }}</span>
      <a href="#" class="password-remove-link" :title="$t('/(panel)(components)(PasswordMenu)remove_password')" @click.prevent="removePassword" />
    </div>
    <div class="password-info">
      <template v-if="password.type == 'generated2'">
        <div class="password-type">{{ $t("/(panel)(components)(PasswordEntry)password_type_generated2") }} </div>
        <div>{{ $t("/(panel)(components)(PasswordEntry)password_length") }} {{ password.length }}</div>
        <div>{{ $t("/(panel)(components)(PasswordEntry)allowed_characters") }}  {{ allowedChars }}</div>
      </template>
      <template v-else-if="password.type == 'stored'">
        <div class="password-type">{{ $t("password_type_stored") }} <span class="help-icon" :title="$t('recovery_code_explanation')" /></div>
        <pre v-if="recoveryCode">{{ recoveryCode }}</pre>
      </template>
      <div v-if="showNotes && password.notes">{{ $t("/(panel)(components)(PasswordEntry)notes") }} {{ password.notes }}</div>
    </div>
  </div>
</template>

<script>
"use strict";

import {set as clipboardSet} from "../../clipboard";
import {passwords, recoveryCodes} from "../../proxy";
import PasswordMessage from "../../components/PasswordMessage.vue";

export default {
  name: "PasswordInfo",
  localePath: "allpasswords/components/PasswordInfo",
  components: {
    "password-message": PasswordMessage
  },
  props: {
    password: {
      type: Object,
      required: true
    },
    siteDisplayName: {
      type: String,
      required: true
    },
    showNotes: {
      type: Boolean,
      required: true
    },
    showPasswords: {
      type: Boolean,
      required: true
    }
  },
  data()
  {
    return {
      value: null,
      recoveryCode: null
    };
  },
  computed: {
    allowedChars()
    {
      let chars = [];
      if (this.password.lower)
        chars.push("abc");
      if (this.password.upper)
        chars.push("XYZ");
      if (this.password.number)
        chars.push("789");
      if (this.password.symbol)
        chars.push("+^;");
      return chars.join(" ");
    }
  },
  watch: {
    showPasswords()
    {
      if (this.showPasswords)
        this.ensureValue().catch(this.showPasswordMessage);
    }
  },
  mounted()
  {
    if (this.password.type == "stored" && !this.recoveryCode)
    {
      recoveryCodes.getCode(this.password).then(code =>
      {
        this.recoveryCode = code;
      }).catch(this.showPasswordMessage);
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
    showPasswordMessage(message)
    {
      this.$refs["password-message"].message = message;
    },
    copy()
    {
      let doCopy = () =>
      {
        clipboardSet(this.value);
        this.showPasswordMessage("password_copied");
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
            this.showPasswordMessage("password_ready");
            let handler = event =>
            {
              window.removeEventListener("click", handler, true);
              event.stopPropagation();
              event.preventDefault();
              doCopy();
            };
            window.addEventListener("click", handler, true);
          }
        }).catch(this.showPasswordMessage);
      }
    },
    removePassword()
    {
      let message = this.$t("/(panel)(components)(PasswordEntry)remove_confirmation", this.password.name, this.siteDisplayName);
      if (this.password.notes)
        message += " " + this.$t("/(panel)(components)(PasswordEntry)remove_confirmation_notes", this.password.notes);
      this.$app.confirm(message).then(accepted =>
      {
        if (!accepted)
          return;

        passwords.removePassword(this.password).then(() =>
        {
          this.$emit("removed");
        }).catch(this.showPasswordMessage);
      });
    },
    activate()
    {
      this.$refs["to-clipboard"].focus();
    }
  }
};
</script>
