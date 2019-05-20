<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <input :value="value.value" @input="update" @change="update">
</template>

<script>
"use strict";

export default {
  name: "ValidatedInput",
  props: {
    "value": {
      type: Object,
      required: true,
      validator(val)
      {
        return typeof val.value == "string";
      }
    }
  },
  data: () => ({
    eagerValidation: false
  }),
  methods: {
    setValue(value)
    {
      this.$el.value = value;
      this.update();
    },
    update(forced)
    {
      let value = this.$el.value.trim();
      if (forced !== true && value == this.value.value)
        return null;

      let newData = {value, error: this.value.error};
      if (this.eagerValidation)
      {
        newData.error = null;
        this.$emit("validate", newData);
      }
      this.$emit("input", newData);
      return newData;
    }
  }
};
</script>
