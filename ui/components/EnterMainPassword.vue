<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ValidatedForm @validated="submit">
    <label for="main-password">{{ $t("password_label") }}</label>
    <PasswordInput
      id="main-password" v-model="password"
      v-model:error="passwordError" :default-focus="true"
      @validate="validatePassword"
    />
    <div v-if="passwordError" class="error">
      {{ passwordError }}
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
    </div>
    <slot />
  </ValidatedForm>
</template>

<script>
"use strict";

import {rememberKeys} from "../keys.js";
import {nativeRequest} from "../protocol.js";

export default {
  name: "EnterMainPassword",
  localePath: "components/EnterMainPassword",
  emits: ["done"],
  data()
  {
    return {
      password: "",
      passwordError: null
    };
  },
  methods: {
    async submit()
    {
      try
      {
        let keys = await nativeRequest("unlock", {
          password: this.password
        });
        await rememberKeys(keys);

        this.$root.keys = keys;
        this.$emit("done");
      }
      catch (error)
      {
        if (error.name == "InvalidCredentials")
          this.passwordError = this.$t("password_declined");
        else
          this.$root.showUnknownError(error);
      }
    },
    validatePassword(value, setError)
    {
      if (!value)
        setError(this.$t("password_required"));
    }
  }
};
</script>
