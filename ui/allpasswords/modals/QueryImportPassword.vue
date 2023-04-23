<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay @cancel="done(false)">
    <form class="modal-form" @submit.prevent="done(true)" @reset.prevent="done(false)">
      <div v-if="showWarning" class="warning">{{ $t("warning") }}</div>
      <label for="backup-password">{{ $t("prompt") }}</label>
      <PasswordInput id="backup-password" v-model="password" :default-focus="true" />
      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </form>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "QueryImportPassword",
  localePath: "allpasswords/modals/QueryImportPassword",
  props: {
    showWarning: {
      type: Boolean,
      default: false
    }
  },
  emits: ["done"],
  data()
  {
    return {
      password: ""
    };
  },
  methods: {
    done(success)
    {
      this.$emit("done", success, this.password);
    }
  }
};
</script>
