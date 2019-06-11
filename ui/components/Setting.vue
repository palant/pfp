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
    <input v-if="typeof defValue == 'boolean'" :id="name" v-model="value" v-focus="focus" type="checkbox">
    <input v-else-if="typeof defValue == 'number'" :id="name" v-model="value" v-focus="focus" type="number" min="0">
  </div>
</template>

<script>
"use strict";

import {prefs} from "../proxy";

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
    focus: {
      type: Boolean,
      default: false
    }
  },
  data()
  {
    return {
      value: this.defValue
    };
  },
  watch: {
    value()
    {
      prefs.set(this.name, this.value);
    }
  },
  created()
  {
    prefs.get(this.name, this.defValue).then(value => this.value = value);
  }
};
</script>
