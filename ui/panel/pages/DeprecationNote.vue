<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <h1>{{ $t("title") }}</h1>
    <p class="deprecationNote">{{ $t("par1") }}</p>
    <p class="deprecationNote">{{ $t("par2") }}</p>
    <p class="deprecationNote">{{ $t("par3") }}</p>
    <p class="deprecationNote">{{ $t("par4") }}</p>
    <ExternalLink type="url" param="https://palant.info/2023/05/02/a-way-forward-for-pfp-pain-free-passwords/">
      {{ $t("more_info") }}
    </ExternalLink>
    <label class="block-start">
      <input v-model="rememberAccept" type="checkbox">
      {{ $t("rememberAccept") }}
    </label>
    <div class="button-container">
      <button v-focus @click="accept">{{ $t("accept") }}</button>
    </div>
  </div>
</template>

<script>
"use strict";

import {ui} from "../../proxy.js";

export default {
  name: "DeprecationNote",
  localePath: "panel/pages/DeprecationNote",
  data()
  {
    return {
      rememberAccept: false
    };
  },
  methods: {
    async accept()
    {
      await ui.acceptDeprecation(this.rememberAccept);
      this.$root.deprecationAccepted = true;
    }
  }
};
</script>
