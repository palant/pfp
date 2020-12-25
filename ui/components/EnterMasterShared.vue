<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <validated-form @validated="submit" @reset.prevent="$emit('done', false)">
    <div v-if="warning" class="warning">{{ warning }}</div>
    <label for="master-password">{{ $t("master_password") }}</label>
    <validated-input id="master-password" v-model="masterPassword"
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
  </validated-form>
</template>

<script>
"use strict";

import {masterPassword} from "../proxy.js";

export function validateMasterPassword(value, setError)
{
  if (value.length < 6)
    setError(this.$t("/(components)(EnterMasterShared)password_too_short"));
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
    submit()
    {
      if (this.callback)
      {
        this.callback(this.masterPassword);
        this.$emit("done", true);
      }
      else
      {
        masterPassword.checkPassword(this.masterPassword).then(() =>
        {
          this.$emit("done", true);
        }).catch(error =>
        {
          if (error == "declined")
            this.masterPasswordError = this.$t("password_declined");
          else
            this.$root.showUnknownError(error);
        });
      }
    },
    validateMasterPassword
  }
};
</script>
