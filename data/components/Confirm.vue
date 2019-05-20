<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay v-if="message" @cancel="reject">
    <div>{{ message }}</div>
    <div class="button-container">
      <button v-focus @click="accept">{{ $t("yes") }}</button>
      <button @click="reject">{{ $t("no") }}</button>
    </div>
  </modal-overlay>
</template>

<script>
"use strict";

export default {
  name: "Confirm",
  data()
  {
    return {
      message: null,
      callback: null
    };
  },
  methods:
  {
    accept()
    {
      this.callback(true);
      this.message = this.callback = null;
    },
    reject()
    {
      this.callback(false);
      this.message = this.callback = null;
    }
  }
};
</script>
