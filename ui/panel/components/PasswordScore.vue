<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="password-score" :data-score="value">
    <div class="password-score-0" />
    <div class="password-score-1" />
    <div class="password-score-2" />
    <div class="password-score-3" />
    <div class="password-score-4" />
  </div>
</template>

<script>
"use strict";

import {zxcvbn, zxcvbnOptions} from "@zxcvbn-ts/core";
import zxcvbnCommon from "@zxcvbn-ts/language-common";
import zxcvbnEn from "@zxcvbn-ts/language-en";

zxcvbnOptions.setOptions({
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnEn.dictionary
  },
  graphs: zxcvbnCommon.adjacencyGraphs
});

export default {
  name: "PasswordScore",
  props: {
    password: {
      type: String,
      required: true
    }
  },
  data()
  {
    return {
      value: 0
    };
  },
  watch: {
    password()
    {
      this.value = zxcvbn(this.password).score;
    }
  }
};
</script>
