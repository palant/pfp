<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div v-keyboard-navigation:shortcut-letter class="shortcuts">
    <a
      v-for="(letter, index) in letters" :key="letter.letter"
      v-focus="focusUnassigned() && index == 0" class="shortcut-letter" href="#"
      @click.prevent="$emit('clicked', letter.param)"
    >{{ letter.letter }}</a>
  </div>
</template>

<script>
"use strict";

export default {
  name: "Shortcuts",
  props: {
    letters: {
      type: Array,
      required: true
    }
  },
  emits: ["clicked"],
  methods: {
    focusUnassigned()
    {
      return !document.activeElement || document.activeElement == document.body;
    }
  }
};
</script>
