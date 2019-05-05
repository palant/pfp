<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <form class="modal-form">
    <label class="block-start" for="recovery-code-value">{{ $t("recovery_code") }}</label>
    <div id="recovery-code-accepted">
      <div v-for="(line, index) in accepted" :key="line">
        {{ line }}
        <a v-if="index == accepted.length - 1" class="recovery-code-strip"
           href="#" :title="$t('recovery_remove_line')"
           @click.prevent="accepted.pop()"
        />
      </div>
    </div>
    <input ref="currentLine" v-focus type="text">
    <div v-if="currentError" class="error">{{ currentError }}</div>
  </form>
</template>

<script>
"use strict";

import {recoveryCodes} from "../../proxy";
import Formatter from "../formatter";
import {showUnknownError} from "../App.vue";

export default {
  data()
  {
    return {
      currentError: null,
      accepted: []
    };
  },
  mounted()
  {
    recoveryCodes.getValidChars().then(validChars =>
    {
      Formatter.addInptType("B", new RegExp(`[${validChars}]`, "i"));

      let self = this;
      new Formatter(this.$refs.currentLine, {
        pattern: "{{BBBB}}-{{BBBB}}-{{BBBB}}:{{BBBB}}-{{BBBB}}-{{BBBB}}"
      })._formatValue = function(...args)
      {
        let callOriginal = message =>
        {
          self.currentError = message;
          Formatter.prototype._formatValue.call(this, ...args);
        };

        let result = self.processRecoveryCodeInput(this, validChars);
        if (result && typeof result.then == "function")
        {
          result.then(result =>
          {
            callOriginal(result);
          }).catch(error =>
          {
            showUnknownError(error);
            callOriginal(null);
          });
        }
        else
          callOriginal(result);
      };
    }).catch(showUnknownError);
  },
  methods: {
    processRecoveryCodeInput(formatter, validChars)
    {
      formatter.val = formatter.val.toUpperCase();

      const lineLen = 24;
      let raw = formatter.val.replace(new RegExp(`[^${validChars}]`, "gi"), "");
      if (raw.length < lineLen)
        return null;

      let existing = this.accepted.join("");
      let checkSubstr = len =>
      {
        let code = existing + raw.substr(0, len);
        return recoveryCodes.isValid(code).then(result =>
        {
          if (result == "ok" || result == "unterminated")
          {
            return recoveryCodes.formatCode(code).then(formatted =>
            {
              this.accepted = formatted.trim().split("\n");
              formatter.val = raw.substr(len);
              if (result == "ok")
              {
                recoveryCodes.decodeCode(formatted).then(password =>
                {
                  this.$emit("done", password);
                }).catch(showUnknownError);
              }
              return null;
            });
          }
          else if (len - lineLen >= lineLen)
            return checkSubstr(len - lineLen);
          else
            throw result;
        }).catch(error =>
        {
          if (error == "checksum-mismatch")
            return this.$t("recovery_checksum_mismatch");
          else
            throw error;
        });
      };
      return checkSubstr(raw.length - raw.length % 24);
    }
  }
};
</script>
