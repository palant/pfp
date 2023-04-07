<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="password-info-container">
    <PasswordMessage
      ref="password-message"
      :messages="{
        password_ready: false,
        password_copied: true,
        no_such_password: false,
        unknown_generation_method: false
      }"
    />

    <div class="password-container">
      <IconicLink ref="to-clipboard" class="to-clipboard-link" :title="$t('/(panel)(components)(PasswordMenu)to_clipboard')" @click="copy" />
      <span class="password-title">{{ password.title }}</span>
      <span v-if="showPasswords && value" class="password-value">{{ value }}</span>
      <IconicLink class="password-remove-link" :title="$t('/(panel)(components)(PasswordMenu)remove_password')" @click="removePassword" />
    </div>
    <div class="password-info">
      <div>{{ $t("/(panel)(components)(PasswordEntry)password_username") }} {{ password.username }}</div>
      <div v-if="showNotes && password.notes">{{ $t("/(panel)(components)(PasswordEntry)notes") }} {{ password.notes }}</div>
      <div v-if="recoveryCode && recoveryCodeParams">
        {{ $t("recovery_code") }}
        <pre>{{ recoveryCode }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
"use strict";

import {set as clipboardSet} from "../../clipboard.js";
import {handleErrors} from "../../common.js";
import {nativeRequest} from "../../protocol.js";
import {getCode} from "../../recoveryCodes.js";
import PasswordMessage from "../../components/PasswordMessage.vue";

export default {
  name: "PasswordInfo",
  localePath: "allpasswords/components/PasswordInfo",
  components: {
    PasswordMessage
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
    },
    recoveryCodeParams: {
      type: Object,
      required: true
    }
  },
  emits: ["removed"],
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
    },
    async recoveryCodeParams()
    {
      if (this.recoveryCodeParams)
      {
        try
        {
          await this.ensureValue();
          this.recoveryCode = await getCode(this.value, this.recoveryCodeParams);
        }
        catch (error)
        {
          this.showPasswordMessage(error);
        }
      }
      else
        this.recoveryCode = null;
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
    removePassword: handleErrors(async function()
    {
      let message = this.$t("/(panel)(components)(PasswordEntry)remove_confirmation", this.password.title, this.siteDisplayName);
      if (this.password.notes)
        message += " " + this.$t("/(panel)(components)(PasswordEntry)remove_confirmation_notes", this.password.notes);
      if (await this.$root.confirm(message))
      {
        try
        {
          await nativeRequest("remove-entry", {
            keys: this.$root.keys,
            uuid: this.password.uuid
          });
          this.$emit("removed");
        }
        catch (error)
        {
          this.showPasswordMessage(error);
        }
      }
    }),
    activate()
    {
      this.$refs["to-clipboard"].$el.focus();
    }
  }
};
</script>
