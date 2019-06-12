<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <validated-form @validated="submit" @reset.native.prevent="$emit('done', false)">
    <div v-if="warning" class="warning">{{ warning }}</div>
    <label for="master-password">{{ $t("master_password") }}</label>
    <validated-input id="master-password" v-model="masterPassword" v-focus
                     type="password" @validate="validateMasterPassword"
    />
    <div v-if="masterPassword.error" class="error">
      {{ masterPassword.error }}
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

import {masterPassword} from "../proxy";

export function validateMasterPassword(val)
{
  if (val.value.length < 6)
    val.error = this.$t("/(components)(EnterMaster)password_too_short");
}

export default {
  name: "EnterMaster",
  localePath: "components/EnterMaster",
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
  data()
  {
    return {
      masterPassword: {value: ""}
    };
  },
  methods: {
    submit()
    {
      if (this.callback)
      {
        this.callback(this.masterPassword.value);
        this.$emit("done", true);
      }
      else
      {
        masterPassword.checkPassword(this.masterPassword.value).then(() =>
        {
          this.$emit("done", true);
        }).catch(error =>
        {
          if (error == "declined")
            this.masterPassword.error = this.$t("password_declined");
          else if (error == "migrating")
            this.$emit("done", error);
          else
            this.$app.showUnknownError(error);
        });
      }
    },
    validateMasterPassword
  }
};
</script>
