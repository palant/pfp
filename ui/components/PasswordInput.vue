<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="password-value-container">
    <ValidatedInput
      :id="id" ref="password" v-model="actualValue" v-model:error="actualError"
      v-focus="defaultFocus" class="password-value"
      :type="visible ? 'text' : 'password'"
      @validate="forwardValidate"
    />
    <IconicLink
      class="show-password" href="#" :class="'iconic-link' + (visible ? ' active' : '')"
      :title="$t(visible ? 'hide_password' : 'show_password')"
      @click="visible = !visible"
    />
  </div>
</template>

<script>
"use strict";

export default {
  name: "PasswordInput",
  localePath: "components/PasswordInput",
  props: {
    "id": {
      type: String,
      default: "password"
    },
    "modelValue": {
      type: String,
      required: true
    },
    "error": {
      type: Object,
      default: null
    },
    "defaultFocus": {
      type: Boolean,
      default: false
    }
  },
  emits: ["validate", "update:modelValue", "update:error"],
  data()
  {
    return {
      actualValue: this.modelValue,
      actualError: this.error,
      visible: false
    };
  },
  watch: {
    modelValue()
    {
      this.actualValue = this.modelValue;
    },
    actualValue()
    {
      this.$emit("update:modelValue", this.actualValue);
    },
    error()
    {
      this.actualError = this.error;
    },
    actualError()
    {
      this.$emit("update:error", this.actualError);
    }
  },
  methods: {
    focus()
    {
      this.$refs.password.$el.focus();
    },
    forwardValidate(...args)
    {
      this.$emit("validate", ...args);
    }
  }
};
</script>
