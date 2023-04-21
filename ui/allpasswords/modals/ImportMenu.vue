<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay v-keyboard-navigation:import-menu-entry :position="position" @cancel="done(null)">
    <a v-focus href="#" class="import-menu-entry" @click.prevent="done('pfp2x')">
      {{ $t("import_pfp2x") }}
    </a>
    <a href="#" class="import-menu-entry" @click.prevent="done('csv')">
      {{ $t("import_csv") }}
    </a>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "ImportMenu",
  localePath: "allpasswords/modals/ImportMenu",
  props: {
    position: {
      type: Object,
      required: true
    }
  },
  emits: ["done"],
  methods: {
    done(action)
    {
      this.$emit("done");
      if (action == "pfp2x")
        this.$parent.importPfP2x();
      else if (action == "csv")
        this.$parent.importCSV();
    }
  }
};
</script>
