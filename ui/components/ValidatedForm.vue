<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <form @submit.prevent="submit">
    <slot />
  </form>
</template>

<script>
"use strict";

export default {
  name: "ValidatedForm",
  emits: ["validated"],
  data: () => ({children: []}),
  methods: {
    registerValidatedChild(child)
    {
      this.children.push(child);
    },

    unregisterValidatedChild(child)
    {
      let index = this.children.indexOf(child);
      if (index >= 0)
        this.children.splice(index, 1);
    },

    submit()
    {
      let seenErrors = false;
      for (let child of this.children)
      {
        child.eagerValidation = true;
        let error = child.update();
        if (error && !seenErrors)
        {
          seenErrors = true;
          if (child.$el.focus)
            child.$el.focus();
        }
      }

      if (!seenErrors)
        this.$emit("validated");
    }
  }
};
</script>
