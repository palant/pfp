<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :cancelable="false">
    <div class="in-progress">
      <div class="spinning-wheel" />
    </div>
  </modal-overlay>
</template>

<script>
"use strict";

export default {
  name: "InProgress"
};
</script>
