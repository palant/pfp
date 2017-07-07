/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global window, chrome, browser */

/* eslint no-var: "off" */

if (typeof browser == "undefined")
{
  window.browser = {
    runtime: chrome.runtime,
    i18n: chrome.i18n
  };
}

var self = {
  port: {
    emit: function(eventName, ...args)
    {
      browser.runtime.sendMessage({type: "contentScript", eventName, args});
    }
  },
  options: null
};

browser.runtime.onMessage.addListener((options, sender, sendResponse) =>
{
  self.options = options;
  sendResponse();
});
