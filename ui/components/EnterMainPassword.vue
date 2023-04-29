<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ValidatedForm @validated="submit">
    <template v-if="databases.length >= 2">
      <label for="database">{{ $t("database_label") }}</label>
      <select id="database" v-model="database">
        <option v-for="name in databases" :key="name">{{ name }}</option>
      </select>
    </template>
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
      <div class="progress-container">
        <button type="submit" v-bind="inProgress ? {disabled: 'disabled'} : {}">{{ $t("submit") }}</button>
        <span v-if="inProgress" class="progress-indicator" />
      </div>
    </div>
    <slot />
  </ValidatedForm>
</template>

<script>
"use strict";

import {handleErrors} from "../common.js";
import {rememberKeys} from "../keys.js";
import {nativeRequest, getDatabase, setDatabase} from "../protocol.js";

export default {
  name: "EnterMainPassword",
  localePath: "components/EnterMainPassword",
  emits: ["done"],
  data()
  {
    return {
      database: null,
      databases: [],
      password: "",
      passwordError: null,
      inProgress: false
    };
  },
  mounted: handleErrors(async function()
  {
    let [database, {databases, defaultDatabase}] = await Promise.all([
      getDatabase(),
      nativeRequest("get-databases", null)
    ]);

    this.databases = databases.sort((a, b) =>
    {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if (a < b)
        return -1;
      else if (a > b)
        return 1;
      else
        return 0;
    });
    this.database = databases.includes(database) ? database : defaultDatabase;
  }),
  methods: {
    async submit()
    {
      this.inProgress = true;
      try
      {
        await setDatabase(this.database);

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
      finally
      {
        this.inProgress = false;
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
