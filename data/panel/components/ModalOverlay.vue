<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="modalOverlay" @click.self="$emit('cancel')" @keydown.escape.prevent.stop="$emit('cancel')">
    <div ref="inner" class="modalOverlay-inner" :class="{stretch: stretch}">
      <div class="modalOverlay-cancel-container">
        <a ref="cancel" href="#" class="modalOverlay-cancel" :title="$t('cancel')" @click.prevent="$emit('cancel')" />
      </div>
      <div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
// Account for new modal opening before the old one finished destroying.
let activeModal = null;

export default {
  name: "ModalOverlay",
  props: {
    focusCancel: {
      type: Boolean,
      default: false
    },
    stretch: {
      type: Boolean,
      default: false
    }
  },
  data()
  {
    return {
      savedActiveElement: null
    };
  },
  beforeMount()
  {
    if (activeModal)
      this.savedActiveElement = activeModal.savedActiveElement;
    else
      this.savedActiveElement = document.activeElement;
    activeModal = this;
  },
  mounted()
  {
    this.ensureDocHeight();
  },
  updated()
  {
    this.ensureDocHeight();
  },
  beforeDestroy()
  {
    if (activeModal == this)
    {
      document.body.style.minHeight = "";
      if (this.savedActiveElement)
        this.savedActiveElement.focus();
      activeModal = null;
    }
  },
  methods: {
    ensureDocHeight()
    {
      // TODO: This is quite hacky, is there a more straightforward way?
      let style = window.getComputedStyle(this.$el, "");
      let height = this.$refs.inner.offsetHeight + parseInt(style.paddingTop) +
        parseInt(style.paddingBottom);
      document.body.style.minHeight = height + "px";

      if (this.focusCancel)
        this.$refs.cancel.focus();
    }
  }
};
</script>
