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

import zxcvbn from "zxcvbn";

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
