<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :cancelable="!!callback" @cancel="done(false)">
    <EnterMasterShared class="modal-form" :cancelable="!!callback" :warning="warning" :callback="callback" @done="done" />
  </ModalOverlay>
</template>

<script>
"use strict";

import EnterMasterShared from "../../components/EnterMasterShared.vue";

export default {
  name: "EnterMaster",
  components: {
    EnterMasterShared
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
  emits: ["done"],
  methods: {
    done(success)
    {
      this.$emit("done", success);
    }
  }
};
</script>
