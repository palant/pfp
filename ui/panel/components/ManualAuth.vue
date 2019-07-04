<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay @cancel="$emit('cancel')">
    <form class="modal-form" @submit.prevent="done">
      <label for="sync-token">{{ $t("token_label") }}</label>
      <input id="sync-token" v-model.trim="token" v-focus>
      <div class="button-container">
        <button type="submit">{{ $t("/ok") }}</button>
      </div>
    </form>
  </modal-overlay>
</template>

<script>
"use strict";

export default {
  name: "ManualAuth",
  props: {
    callback: {
      type: Function,
      required: true
    }
  },
  data()
  {
    return {
      token: ""
    };
  },
  methods: {
    done()
    {
      this.$emit("cancel");
      if (this.token)
        this.callback(this.token);
    }
  }
};
</script>
