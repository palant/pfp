<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div :class="'tag-editor' + (focus ? ' focus' : '')" @click="$refs.input.focus()">
    <ul class="tag-list">
      <li v-for="tag in tags" :key="tag">
        <span class="tag-name">{{ tag }}</span>
        <span
          class="tag-remove" :title="$t('remove_tag')" :aria-label="$t('remove_tag')"
          @click="removeTag(tag)"
        >✕</span>
      </li>
    </ul>
    <input
      :id="id" ref="input" v-model.trim="current" class="tag-input" type="text"
      @keydown="keydown" @input="input" @focus="focus = true" @blur="focus = false; addCurrent()"
    >
  </div>
</template>

<script>
"use strict";

export default {
  name: "TagEditor",
  localePath: "panel/components/TagEditor",
  props: {
    modelValue: {
      type: Array,
      required: true
    },
    id: {
      type: String,
      default: "tag-editor"
    }
  },
  emits: ["update:modelValue"],
  data()
  {
    return {
      current: "",
      tags: this.modelValue ? this.modelValue.slice() : [],
      focus: false
    };
  },
  watch: {
    modelValue()
    {
      this.tags = this.modelValue;
    },
    tags: {
      handler()
      {
        this.$emit("update:modelValue", this.tags);
      },
      deep: true
    }
  },
  methods: {
    addTag(tag)
    {
      tag = tag.trim();
      if (tag && !this.tags.includes(tag))
      {
        this.tags.push(tag);
        this.$nextTick(() => this.$refs.input.scrollIntoView());
      }
    },

    removeTag(tag)
    {
      let index = this.tags.indexOf(tag);
      if (index >= 0)
        this.tags.splice(index, 1);
    },

    addCurrent()
    {
      this.addTag(this.current);
      this.current = "";
    },

    keydown(event)
    {
      if (this.current && (event.key == "Enter" || event.key == "," || event.key == ";"))
      {
        event.preventDefault();
        this.addCurrent();
      }
      else if (event.key == "Backspace" && event.target.selectionStart == 0 && event.target.selectionEnd == 0)
      {
        event.preventDefault();
        this.tags.pop();
      }
    },

    input()
    {
      while (this.current.includes(",") || this.current.includes(";"))
      {
        let index1 = this.current.indexOf(",");
        let index2 = this.current.indexOf(";");
        let index = Math.min(index1 >= 0 ? index1 : this.current.length, index2 >= 0 ? index2 : this.current.length);
        this.addTag(this.current.slice(0, index));
        this.current = this.current.slice(index + 1);
      }
    }
  }
};
</script>
