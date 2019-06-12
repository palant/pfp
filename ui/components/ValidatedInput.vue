<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <input v-if="visible" v-model.trim="actualValue">
</template>

<script>
"use strict";

export default {
  name: "ValidatedInput",
  props: {
    "value": {
      type: String,
      required: true
    },
    "error": {
      type: Object,
      default: null
    },
    "visible": {
      type: Boolean,
      default: true
    }
  },
  data()
  {
    return {
      actualValue: this.value,
      eagerValidation: false
    };
  },
  watch: {
    value()
    {
      this.actualValue = this.value;
      this.update();
    },
    actualValue()
    {
      this.$emit("input", this.actualValue);
    }
  },
  methods: {
    update()
    {
      if (!this.eagerValidation)
        return null;

      let error = null;
      this.$emit("validate", this.value, e => error = e);
      this.$emit("update:error", error);
      return error;
    }
  }
};
</script>
