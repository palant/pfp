<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <a v-if="$isWebClient" :href="url" target="_blank" rel="noopener">
    <slot />
  </a>
  <a v-else :href="url" @click.prevent="openLink">
    <slot />
  </a>
</template>

<script>
"use strict";

import browser from "../browserAPI.js";
import {handleErrors} from "../common.js";

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
  data()
  {
    return {
      url: "#"
    };
  },
  mounted: handleErrors(function()
  {
    this.url = this.getLink();
  }),
  methods:
  {
    getLink()
    {
      if (this.type == "url")
        return this.param;
      else if (this.type == "relnotes")
        return `https://pfp.works/release-notes/${this.param}`;
      else if (this.type == "documentation")
        return `https://pfp.works/documentation/${this.param}/`;

      throw new Error("Unexpected link type");
    },
    openLink: handleErrors(async function()
    {
      await browser.tabs.create({
        url: this.getLink(),
        active: true
      });
    })
  }
};
</script>
