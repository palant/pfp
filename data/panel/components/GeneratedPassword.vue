<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay :stretch="true" @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="submit" @reset.native="$emit('cancel')">
      <div v-if="options.replacing" class="warning replacing">{{ $t("replace_password_warning") }}</div>

      <label for="user-name" :class="{'block-start': options.replacing}">{{ $t("user_name") }}</label>
      <validated-input id="user-name" v-model.trim="name" v-focus v-bind="{readonly: options.replacing}" type="text" @validate="validateName" />
      <div v-if="name.error" class="error">
        {{ name.error }}
      </div>

      <a v-if="!revisionVisible && !options.replacing" href="#" class="change-password-revision" @click.prevent="revisionVisible = true">
        {{ $t("change_password_revision") }}
      </a>
      <template v-else-if="revisionVisible">
        <label class="block-start" for="password-revision">{{ $t("password_revision") }}</label>
        <input id="password-revision" ref="revision" v-model.trim="revision" v-bind="{readonly: options.replacing}" type="text">
      </template>

      <label class="block-start" for="password-length">{{ $t("password_length") }}</label>
      <div class="length-container">
        <input id="password-length" v-model.number="length" type="range" min="4" max="24" step="1">
        <span class="password-length-value">{{ length }}</span>
      </div>

      <label class="block-start" for="charset-lower">{{ $t("allowed_characters") }}</label>
      <div class="charsets-container">
        <label><input id="charset-lower" v-model="lower" type="checkbox">abc</label>
        <label><input v-model="upper" type="checkbox">XYZ</label>
        <label><input v-model="number" type="checkbox">789</label>
        <label><input v-model="symbol" type="checkbox">+^;</label>
      </div>

      <!-- Charset checkboxes are aggregated into a single hidden input to simplify validation -->
      <validated-input ref="charsets" v-model="charsets" hidden @validate="validateCharsets" />
      <div v-if="charsets.error" class="error">{{ charsets.error }}</div>

      <label v-if="!options.replacing && !options.incRevision" class="block-start">
        <input v-model="legacy" type="checkbox">
        {{ $t("generate_legacy") }}
      </label>
      <div v-if="legacy" class="warning legacy">{{ $t("generate_legacy_warning") }}</div>

      <div class="button-container">
        <button type="submit">{{ $t("generate_password") }}</button>
        <button type="reset">{{ $t("cancel") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";

export default {
  name: "GeneratedPassword",
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
      let pwdList = this.$app.pwdList;
      revision = (parseInt(revision, 10) || 1) + 1;
      if (revision < 2)
        revision = 2;
      while (pwdList.some(pwd => pwd.name == name && pwd.revision == revision))
        revision++;
    }

    return {
      name: {
        value: name,
        error: null
      },
      revision: revision || "1",
      revisionVisible: !!revision,
      length: getProp("length", 16),
      lower: getProp("lower", true),
      upper: getProp("upper", true),
      number: getProp("number", true),
      symbol: getProp("symbol", true),
      charsets: {value: "", error: null},
      legacy: false
    };
  },
  watch: {
    revision()
    {
      if (this.name.error == this.$t("user_name_exists"))
        this.name.error = null;
    },
    revisionVisible()
    {
      if (this.revisionVisible)
      {
        this.$nextTick(() =>
        {
          this.$refs.revision.focus();
        });
      }
    },
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
    validateName(newData)
    {
      if (!newData.value)
        newData.error = this.$t("user_name_required");
    },
    updateCharsets()
    {
      this.$refs.charsets.setValue([this.lower, this.upper, this.number, this.symbol].join(" "));
    },
    validateCharsets(newData)
    {
      if (newData.value.split(" ").every(c => c == "false"))
        newData.error = this.$t("no_characters_selected");
    },
    submit()
    {
      let revision = this.revision != "1" ? this.revision : "";

      passwords.addGenerated({
        site: this.$app.site,
        name: this.name.value,
        revision,
        length: this.length,
        lower: this.lower,
        upper: this.upper,
        number: this.number,
        symbol: this.symbol,
        legacy: this.legacy
      }, this.options.replacing).then(pwdList =>
      {
        this.$app.pwdList = pwdList;
        this.$emit("cancel");
      }).catch(error =>
      {
        if (error == "alreadyExists")
        {
          this.name.error = this.$t("user_name_exists");
          this.revisionVisible = true;
        }
        else
          this.$app.showUnknownError(error);
      });
    }
  }
};
</script>
