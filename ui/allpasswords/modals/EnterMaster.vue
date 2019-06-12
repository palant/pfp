<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay @cancel="done(false)">
    <enter-master class="modal-form" :warning="warning" :callback="callback" @done="done" />
  </modal-overlay>
</template>

<script>
"use strict";

import EnterMaster from "../../components/EnterMaster.vue";

export default {
  name: "EnterMaster",
  components: {
    "enter-master": EnterMaster
  },
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
  methods: {
    done(success)
    {
      this.$emit("done", success);
    }
  }
};
</script>
