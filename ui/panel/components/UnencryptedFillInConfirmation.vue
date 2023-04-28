<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay @cancel="$emit('done', null)">
    <div>{{ $t("prompt") }}</div>
    <div class="block-start">
      <label><input v-model="remember" type="checkbox">{{ $t('remember_label') }}</label>
    </div>
    <div v-keyboard-navigation:prompt-button class="button-container">
      <button v-focus class="prompt-button" @click="$emit('done', 'upgrade')">{{ $t("upgrade_label") }}</button>
      <button class="prompt-button" @click="$emit('done', 'fillIn' + (remember ? '+remember' : ''))">{{ $t("accept_label") }}</button>
      <button class="prompt-button" @click="$emit('done', null)">{{ $t("/cancel") }}</button>
    </div>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "UnencryptedFillInConfirmation",
  localePath: "panel/components/UnencryptedFillInConfirmation",
  emits: ["done"],
  data()
  {
    return {
      remember: false
    };
  }
};
</script>
