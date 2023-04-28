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

const messageHideDelay = 3000;

export default {
  name: "PasswordMessage",
  localePath: "components/PasswordMessage",
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
      if (!this.message)
        return;

      if (this.message.name == "NoSuchEntry")
        this.message = "no_such_password";
      else if (this.message.name == "EntryExists")
        this.message = "password_exists";

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
        this.$root.showUnknownError(this.message);
    }
  }
};
</script>
