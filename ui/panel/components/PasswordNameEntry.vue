<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="password-name-entry">
    <label for="user-name">{{ $t("username_label") }}</label>
    <validated-input id="user-name" v-model="name" v-model:error="error" v-focus
                     v-bind="{readonly}" vtype="text" @validate="validateName"
    />
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <a v-if="!revisionVisible && !readonly" href="#" class="change-password-revision" @click.prevent="revisionVisible = true">
      {{ $t("change_password_revision") }}
    </a>
    <template v-else-if="revisionVisible">
      <label class="block-start" for="password-revision">{{ $t("revision_label") }}</label>
      <input id="password-revision" ref="revision" v-model.trim="actualRevision" v-bind="{readonly}" type="text">
    </template>
  </div>
</template>

<script>
"use strict";

export default {
  name: "PasswordNameEntry",
  localePath: "panel/components/PasswordNameEntry",
  props: {
    modelValue: {
      type: String,
      required: true
    },
    revision: {
      type: String,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue", "update:revision"],
  data()
  {
    return {
      name: this.modelValue,
      error: null,
      actualRevision: this.revision,
      revisionVisible: this.revision != "1"
    };
  },
  watch: {
    modelValue()
    {
      this.name = this.modelValue;
    },
    name()
    {
      this.$emit("update:modelValue", this.name);
    },
    actualRevision()
    {
      this.$emit("update:revision", this.actualRevision);
      if (this.error == this.$t("username_exists"))
        this.error = null;
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
    }
  },
  methods: {
    validateName(value, setError)
    {
      if (!value)
        setError(this.$t("username_required"));
    },
    nameConflict()
    {
      this.error = this.$t("username_exists");
      this.revisionVisible = true;
    }
  }
};
</script>
