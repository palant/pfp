<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ValidatedForm @validated="submit" @reset.prevent="$emit('done', false)">
    <div v-if="warning" class="warning">{{ warning }}</div>
    <label for="master-password">{{ $t("master_password") }}</label>
    <ValidatedInput
      id="master-password" v-model="masterPassword"
      v-model:error="masterPasswordError" v-focus
      type="password"
      @validate="validateMasterPassword"
    />
    <div v-if="masterPasswordError" class="error">
      {{ masterPasswordError }}
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
      <button v-if="cancelable" type="reset">{{ $t("/cancel") }}</button>
    </div>
    <slot />
  </ValidatedForm>
</template>

<script>
"use strict";

import {nativeRequest} from "../protocol.js";
import {masterPassword} from "../proxy.js";

export function validateMasterPassword(value, setError)
{
  if (!value)
    setError(this.$t("/(components)(EnterMasterShared)password_required"));
}

export default {
  name: "EnterMasterShared",
  localePath: "components/EnterMasterShared",
  props: {
    callback: {
      type: Function,
      default: null
    },
    warning: {
      type: String,
      default: null
    },
    cancelable: {
      type: Boolean,
      default: true
    }
  },
  emits: ["done"],
  data()
  {
    return {
      masterPassword: "",
      masterPasswordError: null
    };
  },
  methods: {
    async submit()
    {
      if (this.callback)
      {
        this.callback(this.masterPassword);
        this.$emit("done", true);
      }
      else
      {
        try
        {
          let keys = await nativeRequest("unlock", {
            password: this.masterPassword
          });
          await masterPassword.rememberKeys(keys);
          let pwdList = await nativeRequest("get-entries", {
            keys,
            hostname: this.$root.site
          });
          [this.$root.keys, this.$root.pwdList] = [keys, pwdList];
          this.$emit("done", true);
        }
        catch (error)
        {
          if (error.code == "InvalidCredentials")
            this.masterPasswordError = this.$t("password_declined");
          else
            this.$root.showUnknownError(error);
        }
      }
    },
    validateMasterPassword
  }
};
</script>
