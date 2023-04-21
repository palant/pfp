<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="modalOverlay" @click.self="$emit('cancel')" @keydown.stop>
    <div
      ref="inner" class="modalOverlay-inner"
      v-bind="position ? {style: positionStyles(position)} : null"
      :class="{stretch: stretch, cancelable: cancelable}"
    >
      <div v-if="cancelable" class="modalOverlay-cancel-container">
        <IconicLink ref="cancel" v-cancel class="cancel" :title="$t('/cancel')" @click="$emit('cancel')" />
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
    cancelable: {
      type: Boolean,
      default: true
    },
    focusCancel: {
      type: Boolean,
      default: false
    },
    stretch: {
      type: Boolean,
      default: false
    },
    position: {
      type: Object,
      default: null
    }
  },
  emits: ["cancel"],
  data()
  {
    return {
      savedActiveElement: null,
      observer: null
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
    this.observer = new MutationObserver(this.ensureDocHeight);
    this.observer.observe(this.$el, {
      childList: true,
      attributes: true,
      subtree: true
    });
  },
  beforeUnmount()
  {
    if (activeModal == this)
    {
      document.body.style.minHeight = "";
      if (this.savedActiveElement)
        this.savedActiveElement.focus();
      activeModal = null;
    }

    if (this.observer)
    {
      this.observer.disconnect();
      this.observer = null;
    }
  },
  methods: {
    positionStyles(position)
    {
      let styles = [
        "position: absolute",
        "width: auto",
        "min-width: auto"
      ];
      if (typeof position.left == "number")
        styles.push(`left: ${position.left}px`);
      if (typeof position.right == "number")
        styles.push(`right: ${position.right}px`);
      if (typeof position.top == "number")
        styles.push(`top: ${position.top}px`);
      if (typeof position.bottom == "number")
        styles.push(`bottom: ${position.bottom}px`);
      return styles.join(";");
    },
    ensureDocHeight()
    {
      // TODO: This is quite hacky, is there a more straightforward way?
      let style = window.getComputedStyle(this.$el, "");
      let height = this.$refs.inner.offsetHeight + parseInt(style.paddingTop) +
        parseInt(style.paddingBottom);
      document.body.style.minHeight = height + "px";

      if (this.focusCancel)
        this.$refs.cancel.$el.focus();
    }
  }
};
</script>
