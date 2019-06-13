<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <a href="#" :title="title" :aria-label="title" @click.prevent="$emit('click')" />
</template>

<script>
"use strict";

export default {
  name: "IconicLink",
  props: {
    title: {
      type: String,
      required: true
    }
  }
};
</script>
