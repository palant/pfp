/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window, chrome, browser */

if (typeof browser == "undefined")
{
  window.browser = {
    runtime: chrome.runtime,
    i18n: chrome.i18n
  };
}

// i18n

window.addEventListener("DOMContentLoaded", function()
{
  let elements = document.querySelectorAll("[data-l10n-id]");
  for (let i = 0; i < elements.length; i++)
  {
    let element = elements[i];
    let id = element.getAttribute("data-l10n-id").replace(/-/g, "_");
    element.textContent = browser.i18n.getMessage(id);
  }
});

// Work-around for https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9550897/,
// inline all stylesheets.

if (window.navigator.userAgent.indexOf(" Edge/") >= 0)
{
  window.addEventListener("DOMContentLoaded", () =>
  {
    let stylesheets = document.querySelectorAll("link[rel='stylesheet']");
    for (let i = 0; i < stylesheets.length; i++)
    {
      let stylesheet = stylesheets[i];
      let request = new XMLHttpRequest();
      request.open("GET", stylesheet.href);
      request.responseType = "text";
      request.addEventListener("load", () =>
      {
        let element = document.createElement("style");
        element.setAttribute("media", "print");
        element.textContent = request.response;
        stylesheet.parentNode.insertBefore(element, stylesheet.nextSibling);
      });
      request.send(null);
    }
  });
}
