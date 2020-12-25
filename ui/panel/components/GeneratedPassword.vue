<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :stretch="true" @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="submit" @reset="$emit('cancel')">
      <div v-if="options.replacing" class="warning replacing">{{ $t("replace_warning") }}</div>

      <password-name-entry ref="name-entry" v-model="name"
                           v-model:revision="revision"
                           :readonly="options.replacing"
                           :class="{'block-start': options.replacing}"
      />

      <label v-if="password && password.notes" class="block-start">
        <input v-model="keepNotes" type="checkbox">
        {{ $t("keep_notes") }}
      </label>

      <label class="block-start" for="password-length">{{ $t("length_label") }}</label>
      <div class="length-container">
        <input id="password-length" v-model.number="length" type="range" min="4" max="24" step="1">
        <span class="password-length-value">{{ length }}</span>
      </div>

      <label class="block-start" for="charset-lower">{{ $t("allowed_characters_label") }}</label>
      <div class="charsets-container">
        <label><input id="charset-lower" v-model="lower" type="checkbox">abc</label>
        <label><input v-model="upper" type="checkbox">XYZ</label>
        <label><input v-model="number" type="checkbox">789</label>
        <label><input v-model="symbol" type="checkbox">+^;</label>
      </div>

      <!-- Charset checkboxes are aggregated into a single hidden input to simplify validation -->
      <validated-input v-model="charsets" v-model:error="charsetsError"
                       :visible="false" @validate="validateCharsets"
      />
      <div v-if="charsetsError" class="error">{{ charsetsError }}</div>

      <div class="button-container">
        <button type="submit">{{ $t("submit") }}</button>
        <button type="reset">{{ $t("/cancel") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

import {passwords} from "../../proxy.js";
import PasswordNameEntry from "./PasswordNameEntry.vue";

export default {
  name: "GeneratedPassword",
  localePath: "panel/components/GeneratedPassword",
  components: {
    "password-name-entry": PasswordNameEntry
  },
  props: {
    password: {
      type: Object,
      default: null
    },
    options: {
      type: Object,
      default: Object
    }
  },
  emits: ["cancel"],
  data()
  {
    let getProp = (prop, defValue) =>
    {
      if (this.password && prop in this.password)
        return this.password[prop];
      else
        return defValue;
    };

    let name = getProp("name", "");
    let revision = getProp("revision");
    if (this.options.incRevision)
    {
      let pwdList = this.$root.pwdList;
      revision = (parseInt(revision, 10) || 1) + 1;
      if (revision < 2)
        revision = 2;
      while (pwdList.some(pwd => pwd.name == name && pwd.revision == revision))
        revision++;
    }

    return {
      name,
      revision: revision || "1",
      length: getProp("length", 16),
      lower: getProp("lower", true),
      upper: getProp("upper", true),
      number: getProp("number", true),
      symbol: getProp("symbol", true),
      charsets: "",
      charsetsError: null,
      keepNotes: !!this.password
    };
  },
  watch: {
    lower()
    {
      this.updateCharsets();
    },
    upper()
    {
      this.updateCharsets();
    },
    number()
    {
      this.updateCharsets();
    },
    symbol()
    {
      this.updateCharsets();
    }
  },
  mounted()
  {
    this.updateCharsets();
  },
  methods: {
    updateCharsets()
    {
      this.charsets = [this.lower, this.upper, this.number, this.symbol].join(" ");
    },
    validateCharsets(value, setError)
    {
      if (value.split(" ").every(c => c == "false"))
        setError(this.$t("no_characters_selected"));
    },
    submit()
    {
      let revision = this.revision != "1" ? this.revision : "";

      passwords.addGenerated({
        site: this.$root.site,
        name: this.name,
        revision,
        length: this.length,
        lower: this.lower,
        upper: this.upper,
        number: this.number,
        symbol: this.symbol,
        notes: this.keepNotes ? this.password.notes : null
      }, this.options.replacing).then(pwdList =>
      {
        this.$root.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(error =>
      {
        if (error == "alreadyExists")
          this.$refs["name-entry"].nameConflict();
        else
          this.$root.showUnknownError(error);
      });
    }
  }
};
</script>
