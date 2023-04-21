<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :cancelable="false">
    <EnterMasterShared class="modal-form" @done="$emit('done')" />
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
  emits: ["done"]
};
</script>
