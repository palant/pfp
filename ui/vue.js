/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {createApp} from "vue";

import {keyboardNavigationType} from "./common.js";
import I18n from "./i18n.js";
import AccessKeys from "./accessKeys.js";
import ExternalLink from "./components/ExternalLink.vue";
import IconicLink from "./components/IconicLink.vue";
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

function init(App, isWebClient)
{
  let app = createApp(App);

  app.config.globalProperties.$isWebClient = isWebClient;

  app.use(I18n);
  app.use(AccessKeys);

  app.component("ExternalLink", ExternalLink);
  app.component("IconicLink", IconicLink);
  app.component("ModalOverlay", ModalOverlay);
  app.component("ValidatedForm", ValidatedForm);
  app.component("ValidatedInput", ValidatedInput);

  app.directive("focus", {
    mounted(element, binding)
    {
      if (typeof binding.value == "undefined" || binding.value)
        element.focus();
    }
  });

  app.directive("cancel", {
    mounted(element, binding)
    {
      binding.instance.$el.addEventListener("keydown", event =>
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

  app.directive("select", {
    mounted(element)
    {
      element.select();
    }
  });

  app.directive("scroll-active", {
    updated(element)
    {
      if (element.classList.contains("active"))
        element.scrollIntoView({block: "nearest"});
    }
  });

  app.directive("keyboard-navigation", {
    mounted(element, binding)
    {
      element.addEventListener("keydown", event =>
      {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
          return;

        let type = keyboardNavigationType(event);
        if (!type)
          return;

        let current = document.activeElement;
        let elements = document.getElementsByClassName(binding.arg);
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

  app.mount("#app");
}

export function runApp(App, isWebClient = false)
{
  if (document.readyState != "complete")
  {
    let callback = function()
    {
      window.removeEventListener("load", callback);
      init(App, isWebClient);
    };
    window.addEventListener("load", callback);
  }
  else
    init(App, isWebClient);
}
