<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div v-if="messages.hasOwnProperty(message)" :class="success ? 'success' : 'warning'">{{ $t(message) }}</div>
</template>

<script>
"use strict";

import {showUnknownError} from "../App.vue";

const messageHideDelay = 3000;

export default {
  name: "PasswordMessage",
  props: {
    messages: {
      type: Object,
      required: true
    }
  },
  data()
  {
    return {
      message: null,
      resetTimeout: null
    };
  },
  computed: {
    success()
    {
      return this.messages[this.message];
    }
  },
  watch: {
    message()
    {
      if (this.messages.hasOwnProperty(this.message))
      {
        if (this.resetTimeout)
          window.clearTimeout(this.resetTimeout);
        this.resetTimeout = window.setTimeout(() =>
        {
          this.resetTimeout = this.message = null;
        }, messageHideDelay);
      }
      else
        showUnknownError(this.message);
    }
  }
};
</script>
