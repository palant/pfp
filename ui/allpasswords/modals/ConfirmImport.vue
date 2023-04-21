<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay @cancel="done(false)">
    <div>{{ $t("title") }}</div>
    <dl>
      <template v-for="site in data" :key="site.name">
        <dt>
          {{ site.name }}
          <template v-if="site.aliases.length">
            ({{ $t(".(SiteInfo)aliases_label") }} {{ site.aliases.slice().sort().join(", ") }})
          </template>
        </dt>
        <dd
          v-for="entry in site.entries.map(e => e.title).sort()"
          :key="entry"
        >{{ entry }}</dd>
      </template>
    </dl>
    <div>{{ $t("question") }}</div>
    <div class="button-container">
      <button v-focus @click="done(true)">{{ $t("/(components)(Confirm)yes") }}</button>
      <button @click="done(false)">{{ $t("/(components)(Confirm)no") }}</button>
    </div>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "ConfirmImport",
  localePath: "allpasswords/modals/ConfirmImport",
  props: {
    data: {
      type: Object,
      required: true
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
