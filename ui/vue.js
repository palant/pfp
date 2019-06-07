/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";

import {keyboardNavigationType} from "./common";
import I18n from "./i18n";
import ExternalLink from "./components/ExternalLink.vue";
import ModalOverlay from "./components/ModalOverlay.vue";
import ValidatedForm from "./components/ValidatedForm.vue";
import ValidatedInput from "./components/ValidatedInput.vue";

if (!("isConnected" in Node.prototype))
{
  // Edge and Firefox <53 don't have Node.isConnected
  Object.defineProperty(Node.prototype, "isConnected", {
    get()
    {
      return document.contains(this);
    }
  });
}

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
    vnode.context.$el.addEventListener("keydown", event =>
    {
      if (event.defaultPrevented || event.key != "Escape" ||
          event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
      {
        return;
      }
      if (!element.isConnected)
        return;

      event.preventDefault();
      element.click();
    });
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

Vue.directive("keyboard-navigation", {
  inserted(element, binding)
  {
    element.addEventListener("keydown", event =>
    {
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
        return;

      let type = keyboardNavigationType(event);
      if (!type)
        return;

      let current = document.activeElement;
      let elements = document.getElementsByClassName(binding.expression);
      let index = [].indexOf.call(elements, current);
      if (index < 0)
        return;

      event.preventDefault();
      if (type.startsWith("back") && index - 1 >= 0)
        elements[index - 1].focus();
      else if (type.startsWith("forward") && index + 1 < elements.length)
        elements[index + 1].focus();
      else if (type.startsWith("start"))
        elements[0].focus();
      else if (type.startsWith("end"))
        elements[elements.length - 1].focus();
    });
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

export function runApp(App, isWebClient = false)
{
  Vue.prototype.$isWebClient = isWebClient;

  function init()
  {
    window.removeEventListener("load", init);

    new Vue({
      el: "#app",
      render: createElement => createElement(App)
    });
  }

  window.addEventListener("load", init);
}
