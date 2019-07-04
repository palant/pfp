<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :stretch="true" @cancel="$emit('cancel')">
    <form class="modal-form" @submit.prevent="saveNotes" @reset.prevent="$emit('cancel')">
      <label>{{ $t(".(PasswordNameEntry)username_label") }}</label>
      <div>
        {{ password.name }}
        <span v-if="password.revision" class="password-revision">{{ password.revision }}</span>
      </div>
      <label class="block-start" for="notes-textarea">{{ $t("notes_label") }}</label>
      <textarea id="notes-textarea" v-model.trim="value" v-focus />
      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </form>
  </modal-overlay>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";

export default {
  name: "NotesEditor",
  props: {
    password: {
      type: Object,
      required: true
    }
  },
  data()
  {
    return {
      value: this.password.notes || ""
    };
  },
  methods:
  {
    saveNotes()
    {
      passwords.setNotes(this.password, this.value).then(pwdList =>
      {
        this.$app.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(this.$app.showUnknownError);
    }
  }
};
</script>
