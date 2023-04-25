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
        password_copied: true,
        no_such_password: false
      }"
    />

    <div class="password-container">
      <IconicLink ref="to-clipboard" class="to-clipboard-link" :title="$t('/(panel)(components)(PasswordMenu)to_clipboard')" @click="copy" />
      <span class="password-title">{{ password.title }}</span>
      <span v-if="showPasswords" class="password-value">{{ password.password }}</span>
      <IconicLink class="password-remove-link" :title="$t('/(panel)(components)(PasswordMenu)remove_password')" @click="removePassword" />
    </div>
    <div class="password-info">
      <div>{{ $t("/(panel)(components)(PasswordEntry)password_username") }} {{ password.username }}</div>
      <div v-if="showNotes && password.notes" class="notes">{{ $t("/(panel)(components)(PasswordEntry)notes") }} {{ password.notes }}</div>
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
    async recoveryCodeParams()
    {
      if (this.recoveryCodeParams)
      {
        try
        {
          this.recoveryCode = await getCode(this.password.password, this.recoveryCodeParams);
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
    showPasswordMessage(message)
    {
      this.$refs["password-message"].message = message;
    },
    copy()
    {
      clipboardSet(this.password.password);
      this.showPasswordMessage("password_copied");
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
