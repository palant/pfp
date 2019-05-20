/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";

import I18n from "../i18n";
import App from "./App.vue";

Vue.directive("focus", {
  inserted(element, binding)
  {
    if (typeof binding.value == "undefined" || binding.value)
      element.focus();
  }
});

Vue.use(I18n);

function init()
{
  window.removeEventListener("load", init);

  new Vue({
    el: "#app",
    render: createElement => createElement(App)
  });
}
window.addEventListener("load", init);
