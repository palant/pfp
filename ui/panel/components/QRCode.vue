<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay :focus-cancel="true" @cancel="$emit('cancel')">
    <div>{{ $t(".(PasswordNameEntry)username_label") }}</div>
    <div>
      <span>{{ password.name }}</span>
      <span v-if="password.revision" class="password-revision">{{ password.revision }}</span>
    </div>
    <div class="block-start qrcode-canvas-container">
      <canvas ref="canvas" :width="size" :height="size" />
    </div>
  </ModalOverlay>
</template>

<script>
"use strict";

import qrcode from "qrcode/lib/core/qrcode.js";
import qrcodeRenderer from "qrcode/lib/renderer/canvas.js";

const SCALE = 8;

export default {
  name: "QRCode",
  localePath: "panel/components/QRCode",
  props: {
    password: {
      type: Object,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  },
  emits: ["cancel"],
  data()
  {
    let code = qrcode.create(this.value);
    return {
      code,
      size: code.modules.size * SCALE
    };
  },
  mounted()
  {
    qrcodeRenderer.render(this.code, this.$refs.canvas, {scale: SCALE, margin: 0});
  }
};
</script>
