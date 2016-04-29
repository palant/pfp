/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

/* eslint no-var: "off" */

var self = {
  port: {
    emit: function(eventName, ...args)
    {
      chrome.runtime.sendMessage({type: "contentScript", eventName, args});
    }
  },
  options: null
};

chrome.runtime.onMessage.addListener(options =>
{
  self.options = options;
});
