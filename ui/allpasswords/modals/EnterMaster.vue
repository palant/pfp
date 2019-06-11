<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay @cancel="$emit('cancel', false)">
    <validated-form class="modal-form" @validated="submit" @reset.native.prevent="$emit('cancel', false)">
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
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

import {validateMasterPassword} from "../../common";
import {masterPassword} from "../../proxy";

export default {
  name: "EnterMaster",
  localePath: "panel/pages/EnterMaster",
  props: {
    callback: {
      type: Function,
      default: null
    },
    warning: {
      type: String,
      default: null
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
        this.$emit("cancel", true);
      }
      else
      {
        masterPassword.checkPassword(this.masterPassword.value).then(() =>
        {
          this.$emit("cancel", true);
        }).catch(error =>
        {
          if (error == "declined")
            this.masterPassword.error = this.$t("password_declined");
          else
            this.$app.showUnknownError(error);
        });
      }
    },
    validateMasterPassword
  }
};
</script>
