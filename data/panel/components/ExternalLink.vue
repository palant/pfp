<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <a v-if="isWebClient" :href="url" target="_blank">
    <slot />
  </a>
  <a v-else href="#" @click.prevent="click">
    <slot />
  </a>
</template>

<script>
"use strict";

import {ui} from "../../proxy";
import {showUnknownError} from "../App.vue";

export default {
  name: "ExternalLink",
  props: {
    type: {
      type: String,
      required: true
    },
    param: {
      type: String,
      required: true
    }
  },
  mounted()
  {
    ui.getLink({
      type: this.type,
      param: this.param
    }).then(url => this.url = url).catch(showUnknownError);
  },
  methods:
  {
    click()
    {
      ui.openLink({
        type: this.type,
        param: this.param
      }).catch(showUnknownError);
    }
  }
};
</script>
