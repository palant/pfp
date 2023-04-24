<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="setting">
    <div class="setting-label">
      <label :for="name">{{ $t(name + "_title") }}</label>
      <span class="description">{{ $t(name + "_description") }}</span>
    </div>
    <input v-if="typeof defValue == 'boolean'" :id="name" ref="input" v-model="value" v-focus="defaultFocus" type="checkbox">
    <input v-else-if="typeof defValue == 'number'" :id="name" ref="input" v-model="value" v-focus="defaultFocus" type="number" :min="minValue">
  </div>
</template>

<script>
"use strict";

import {getPref, setPref} from "../prefs.js";

export default {
  name: "Setting",
  localePath: "components/Setting",
  props: {
    name: {
      type: String,
      required: true
    },
    defValue: {
      type: [Boolean, Number],
      required: true
    },
    minValue: {
      type: Number,
      default: 0
    },
    defaultFocus: {
      type: Boolean,
      default: false
    }
  },
  emits: ["modified"],
  data()
  {
    return {
      value: this.defValue
    };
  },
  watch: {
    async value()
    {
      if (this.$refs.input.validationMessage)
        return;

      if (typeof this.defValue == "number" && typeof this.value != "number")
      {
        this.value = parseInt(this.value, 10);
        return;
      }

      await setPref(this.name, this.value);
      this.$emit("modified");
    }
  },
  async created()
  {
    this.value = await getPref(this.name, this.defValue);
  }
};
</script>
