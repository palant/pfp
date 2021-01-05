<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="size-selector">
    <IconicLink class="increase-size" :title="$t('/increase_size')" @click="changeSize(1)" />
    <IconicLink class="decrease-size" :title="$t('/decrease_size')" @click="changeSize(-1)" />
  </div>
</template>

<script>
"use strict";

const MIN_SIZE = 1;
const MAX_SIZE = 5;

export default {
  name: "SizeSelector",
  localePath: "components/SizeSelector",
  mounted()
  {
    this.updateSize();
    window.addEventListener("storage", this.updateSize);
  },
  unmounted()
  {
    window.removeEventListener("storage", this.updateSize);
  },
  methods:
  {
    toValidSize(size)
    {
      size = parseInt(size, 10);
      if (isNaN(size))
        size = 3;
      return Math.max(Math.min(size, MAX_SIZE), MIN_SIZE);
    },
    getSize()
    {
      return this.toValidSize(localStorage.size);
    },
    changeSize(addition)
    {
      localStorage.size = this.toValidSize(this.getSize() + addition);
      this.updateSize();
    },
    updateSize()
    {
      document.documentElement.setAttribute("data-size", this.getSize());
    }
  }
};
</script>
