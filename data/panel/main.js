/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";
import VueRouter from "vue-router";

import I18n from "../i18n";
import App from "./App.vue";
import router from "./router";
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

Vue.prototype.isWebClient = document.documentElement.classList.contains("webclient");

let app = new Vue({
  router,
  render: f => f(App)
});

function init()
{
  window.removeEventListener("load", init);
  app.$mount("#app");
}
window.addEventListener("load", init);

// Hack: expose __webpack_require__ for simpler debugging
/* global __webpack_require__ */
export default __webpack_require__;
