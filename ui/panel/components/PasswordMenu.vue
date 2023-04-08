<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <ModalOverlay v-keyboard-navigation:password-menu-entry @cancel="$emit('cancel')">
    <a v-if="!$isWebClient" v-focus href="#" class="password-menu-entry" @click.prevent="$parent.fillIn">
      <span class="to-document-link iconic-link" />
      {{ $t("to_document") }}
    </a>
    <div class="password-menu-entry-container">
      <a v-focus="$isWebClient" href="#" class="password-menu-entry" @click.prevent="$parent.copy">
        <span class="to-clipboard-link iconic-link" />
        {{ $t("to_clipboard") }}
      </a>
      <a v-if="password.username" href="#" class="password-menu-entry" @click.prevent="$parent.copyUsername">
        {{ $t("to_clipboard_username") }}
      </a>
    </div>
    <a href="#" class="password-menu-entry" @click.prevent="$parent.showQRCode">
      <span class="show-qrcode-link iconic-link" />
      {{ $t("show_qrcode") }}
    </a>
    <a href="#" class="password-menu-entry" @click.prevent="$parent.editEntry">
      <span class="edit-entry-link iconic-link" />
      {{ $t("edit_entry") }}
    </a>
    <a href="#" class="password-menu-entry" @click.prevent="$parent.showNotes">
      <span class="notes-link iconic-link" />
      {{ $t(password.notes ? "edit_notes" : "add_notes") }}
    </a>
    <a href="#" class="password-menu-entry" @click.prevent="$parent.duplicate">
      <span class="duplicate-link iconic-link" />
      {{ $t("duplicate") }}
    </a>
    <a href="#" class="password-menu-entry" @click.prevent="$parent.removePassword">
      <span class="password-remove-link iconic-link" />
      {{ $t("remove_password") }}
    </a>
  </ModalOverlay>
</template>

<script>
"use strict";

export default {
  name: "PasswordMenu",
  localePath: "panel/components/PasswordMenu",
  props: {
    password: {
      type: Object,
      required: true
    }
  },
  emits: ["cancel"]
};
</script>
