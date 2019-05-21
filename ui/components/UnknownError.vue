<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="warning">
    <a href="#" class="unknown-error-cancel cancel" :title="$t('close')" @click.prevent="$emit('close')" />
    <span>{{ $t("unknown_error") + " " }}</span>
    <a v-if="!showDetails" href="#" @click.prevent="showDetails = true">{{ $t("unknown_error_more") }}</a>
    <div v-else class="unknown-error-details">{{ stringify(error) }}</div>
  </div>
</template>

<script>
"use strict";

export default {
  name: "UnknownError",
  props: {
    error: {
      type: Object,
      required: true
    }
  },
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
