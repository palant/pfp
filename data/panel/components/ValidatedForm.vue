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
  methods: {
    forValidatedChildren(callback, vm)
    {
      if (!vm)
        vm = this;

      for (let child of vm.$children)
      {
        if (child.$options.name == "ValidatedInput")
          callback(child);
        else
          this.forValidatedChildren(callback, child);
      }
    },

    submit()
    {
      let seenErrors = false;
      this.forValidatedChildren(child =>
      {
        child.eagerValidation = true;
        let error = child.update(true).error;
        if (error && !seenErrors)
        {
          seenErrors = true;
          child.$el.focus();
        }
      });

      if (!seenErrors)
        this.$emit("validated");
    }
  }
};
</script>
