<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <form class="modal-form">
    <label class="block-start" for="recoveryInput">{{ $t("recovery_code") }}</label>
    <div class="recovery-code-accepted">
      <div v-for="(line, index) in accepted" :key="line">
        {{ line }}
        <a v-if="index == accepted.length - 1" class="recovery-code-strip"
           href="#" :title="$t('recovery_remove_line')"
           @click.prevent="accepted.pop()"
        />
      </div>
    </div>
    <textarea id="recoveryInput" ref="recoveryInput" v-focus
              autocomplete="off" autocorrect="off" spellcheck="false"
              @input="processInput" @change="processInput"
    />
    <div v-if="currentError" class="error">{{ currentError }}</div>
  </form>
</template>

<script>
"use strict";

import {recoveryCodes} from "../../proxy";

export default {
  data()
  {
    return {
      validChars: "",
      currentError: null,
      accepted: []
    };
  },
  mounted()
  {
    recoveryCodes.getValidChars().then(validChars =>
    {
      this.validChars = validChars;
    }).catch(this.$app.showUnknownError);
  },
  methods: {
    insert(str, substr, pos)
    {
      return str.substr(0, pos) + substr + str.substr(pos);
    },
    getValue()
    {
      let input = this.$refs.recoveryInput;
      let value = input.value;
      value = this.insert(value, "\0", input.selectionEnd);
      value = this.insert(value, "\0", input.selectionStart);
      return [value, input.selectionDirection];
    },
    setValue([value, selectionDirection])
    {
      let input = this.$refs.recoveryInput;
      let selection = [value.indexOf("\0"), value.lastIndexOf("\0") - 1];
      input.value = value.replace(/\0/g, "");
      input.setSelectionRange(selection[0], selection[1], selectionDirection);
    },
    formatValue(value)
    {
      value = value.toUpperCase();
      value = value.replace(new RegExp(`[^${this.validChars}\0]`, "gi"), "");
      value = value.replace(/(?:\w\0*){23}\w/g, "$&\n");
      value = value.replace(/(?:\w\0*){11}\w(?=[\w\0])/g, "$&:");
      value = value.replace(/(?:\w\0*){3}\w(?=[\w\0])/g, "$&-");
      return value;
    },
    processInput()
    {
      let [value, selectionDirection] = this.getValue();
      value = this.formatValue(value);
      this.setValue([value, selectionDirection]);

      if (!value.includes("\n"))
      {
        this.currentError = null;
        return;
      }

      let error = null;
      let checkSubstr = fromIndex =>
      {
        let index = value.lastIndexOf("\n", fromIndex);
        if (fromIndex < 0 || index < 0)
          return error ? Promise.reject(error) : Promise.resolve();

        let code = this.accepted.join("") + value.substr(0, index);
        return recoveryCodes.isValid(code).then(result =>
        {
          if (result == "ok" || result == "unterminated")
          {
            this.accepted = this.formatValue(code).trim().split("\n");
            this.setValue([value.substr(index + 1), selectionDirection]);
            if (result == "ok")
            {
              recoveryCodes.decodeCode(code).then(password =>
              {
                this.$emit("done", password);
              }).catch(this.$app.showUnknownError);
            }
            return error ? Promise.reject(error) : Promise.resolve();
          }
          else
          {
            if (result == "checksum-mismatch")
              error = this.$t("recovery_checksum_mismatch");
            else
              error = result;
            return checkSubstr(index - 1);
          }
        });
      };

      checkSubstr().then(() =>
      {
        this.currentError = null;
      }).catch(error =>
      {
        this.currentError = error;
      });
    }
  }
};
</script>
