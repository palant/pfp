<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="unknown-error warning">
    <IconicLink class="unknown-error-cancel cancel" :title="$t('close')" @click="$emit('close')" />
    <span>{{ $t("description") + " " }}</span>
    <a v-if="!showDetails" href="#" @click.prevent="showDetails = true">{{ $t("more") }}</a>
    <div v-else class="unknown-error-details">{{ stringify(error) }}</div>
  </div>
</template>

<script>
"use strict";

export default {
  name: "UnknownError",
  localePath: "components/UnknownError",
  props: {
    error: {
      type: Object,
      required: true
    }
  },
  emits: ["close"],
  data()
  {
    return {
      showDetails: false
    };
  },
  methods:
  {
    stringify(error)
    {
      if (error.stack)
        return error + "\n" + error.stack;
      else
        return String(error);
    }
  }
};
</script>
