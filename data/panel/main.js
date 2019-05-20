/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";

import I18n from "../i18n";
import App from "./App.vue";
import ExternalLink from "./components/ExternalLink.vue";
import ModalOverlay from "./components/ModalOverlay.vue";
import ValidatedForm from "./components/ValidatedForm.vue";
import ValidatedInput from "./components/ValidatedInput.vue";

Vue.use(I18n);

Vue.component("external-link", ExternalLink);
Vue.component("modal-overlay", ModalOverlay);
Vue.component("validated-form", ValidatedForm);
Vue.component("validated-input", ValidatedInput);

Vue.directive("focus", {
  inserted(element, binding)
  {
    if (typeof binding.value == "undefined" || binding.value)
      element.focus();
  }
});

Vue.directive("cancel", {
  inserted(element, binding, vnode)
  {
    if (typeof binding.value == "undefined" || binding.value)
    {
      vnode.context.$el.addEventListener("keydown", event =>
      {
        if (event.defaultPrevented || event.key != "Escape" ||
            event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
        {
          return;
        }

        event.preventDefault();
        element.click();
      });
    }
  }
});

Vue.directive("select", {
  inserted(element)
  {
    element.select();
  }
});

Vue.directive("scroll-active", {
  update(element)
  {
    if (element.classList.contains("active"))
      element.scrollIntoView({block: "nearest"});
  }
});

Vue.mixin({
  beforeCreate()
  {
    if (this.$options.name == "App")
      this.$app = this;
    else if (this.$parent)
      this.$app = this.$parent.$app;
  }
});

Vue.prototype.$isWebClient = document.documentElement.classList.contains("webclient");

function init()
{
  window.removeEventListener("load", init);

  new Vue({
    el: "#app",
    render: createElement => createElement(App)
  });
}
window.addEventListener("load", init);

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
export default __webpack_require__;
