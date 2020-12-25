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
    "modelValue": {
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
  emits: ["validate", "update:modelValue", "update:error"],
  data()
  {
    return {
      actualValue: this.modelValue,
      eagerValidation: false
    };
  },
  watch: {
    modelValue()
    {
      this.actualValue = this.modelValue;
      this.update();
    },
    actualValue()
    {
      this.$emit("update:modelValue", this.actualValue);
    }
  },
  mounted()
  {
    for (let parent = this.$parent; parent; parent = parent.$parent)
    {
      if (parent.registerValidatedChild)
      {
        parent.registerValidatedChild(this);
        break;
      }
    }
  },
  beforeUnmount()
  {
    for (let parent = this.$parent; parent; parent = parent.$parent)
    {
      if (parent.unregisterValidatedChild)
      {
        parent.unregisterValidatedChild(this);
        break;
      }
    }
  },
  methods: {
    update()
    {
      if (!this.eagerValidation)
        return null;

      let error = null;
      this.$emit("validate", this.modelValue, e => error = e);
      this.$emit("update:error", error);
      return error;
    }
  }
};
</script>
