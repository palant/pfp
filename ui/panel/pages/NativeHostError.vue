<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <h1>{{ $t("title") }}</h1>
    <p>{{ $t(error) }}</p>
    <p v-if="error == 'inaccessible' || error == 'native_host_outdated'">
      <ExternalLink v-focus type="documentation" param="installing-native-host">
        {{ $t("download_title") }}
      </ExternalLink>
    </p>
  </div>
</template>

<script>
"use strict";

export default {
  name: "NativeHostError",
  localePath: "panel/pages/NativeHostError",
  props: {
    error: {
      type: String,
      required: true
    }
  },
};
</script>
