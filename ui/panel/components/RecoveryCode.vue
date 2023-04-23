<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ValidatedForm class="modal-form" @validated="submit" @reset="$emit('done', null)">
    <label class="block-start" for="recoveryInput">{{ $t("label") }}</label>
    <div class="recovery-code-accepted">
      <div v-for="(line, index) in accepted" :key="line">
        {{ line }}
        <IconicLink
          v-if="index == accepted.length - 1"
          class="recovery-code-strip cancel"
          :title="$t('remove_line')" @click="removeLine"
        />
      </div>
    </div>
    <textarea
      v-if="!complete"
      id="recoveryInput" ref="recoveryInput" v-focus
      autocomplete="off" autocorrect="off" spellcheck="false"
      @input="processInput" @change="processInput"
      @keydown.delete="onDelete" @keydown.backspace="onBackspace"
    />
    <div v-if="currentError" class="error">{{ currentError }}</div>
    <label class="block-start" for="recoveryPassword">{{ $t("password_label") }}</label>
    <PasswordInput
      id="recovery-password" ref="password" v-model="password"
      v-model:error="passwordError" @validate="validatePassword"
    />
    <div v-if="passwordError" class="error">{{ passwordError }}</div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
      <button type="reset">{{ $t("/cancel") }}</button>
    </div>
  </ValidatedForm>
</template>

<script>
"use strict";

import {handleErrors} from "../../common.js";
import {base32Alphabet, isValid, decodeCode} from "../../recoveryCodes.js";

export default {
  name: "RecoveryCode",
  localePath: "panel/components/RecoveryCode",
  emits: ["done"],
  data()
  {
    return {
      currentError: null,
      accepted: [],
      complete: false,
      password: "",
      passwordError: null
    };
  },
  watch: {
    complete()
    {
      if (this.complete)
        this.$nextTick(() => this.$refs.password.focus());
    }
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
      value = value.replace(new RegExp(`[^${base32Alphabet}\0]`, "gi"), "");
      value = value.replace(/(?:\w\0*){23}\w/g, "$&\n");
      value = value.replace(/(?:\w\0*){11}\w(?=\0*\w)/g, "$&:");
      value = value.replace(/(?:\w\0*){3}\w(?=\0*\w)/g, "$&-");
      return value;
    },
    processInput: handleErrors(async function()
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
      let fromIndex = undefined;
      for (;;)
      {
        let index = value.lastIndexOf("\n", fromIndex);
        if (fromIndex < 0 || index < 0)
          break;

        let code = this.accepted.join("") + value.substr(0, index);
        let validity = isValid(code);
        if (validity == "ok" || validity == "unterminated")
        {
          this.accepted = this.formatValue(code).trim().replace(/\0/g, "").split("\n");
          this.setValue([value.substr(index + 1), selectionDirection]);
          this.complete = (validity == "ok");
          break;
        }
        else
        {
          if (validity == "checksum_mismatch")
            error = this.$t(validity);
          else
            error = validity;
          fromIndex = index - 1;
        }
      }

      this.currentError = error;
    }),
    removeLine()
    {
      this.accepted.pop();
      this.complete = false;
    },
    onDelete()
    {
      let input = this.$refs.recoveryInput;
      if (input.selectionStart != input.selectionEnd)
        return;

      while (input.selectionStart < input.value.length - 1 && !/\w/.test(input.value[input.selectionStart]))
        input.selectionStart++;
    },
    onBackspace()
    {
      let input = this.$refs.recoveryInput;
      if (input.selectionStart != input.selectionEnd)
        return;

      while (input.selectionEnd > 0 && !/\w/.test(input.value[input.selectionEnd - 1]))
        input.selectionEnd--;
    },
    validatePassword(value, setError)
    {
      if (!value)
        setError(this.$t("password_required"));
    },
    submit: handleErrors(async function()
    {
      if (!this.complete)
      {
        this.currentError = this.$t("code_incomplete");
        return;
      }

      try
      {
        let password = await decodeCode(this.accepted.join(""), this.password);
        this.$emit("done", password);
      }
      catch (error)
      {
        if (error == "wrong_version" || error == "invalid_password")
          this.currentError = this.$t(error);
        else
          this.currentError = error;
      }
    })
  }
};
</script>
