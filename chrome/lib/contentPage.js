/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget, emit} = require("../../lib/eventTarget");
let page = EventTarget();

chrome.runtime.onConnect.addListener(function(port)
{
  if (port.name == "pagemod")
  {
    let target = EventTarget();

    target.emit = function(eventName, ...args)
    {
      // "Normalize" args, Firefox won't accept proxies via messaging (bug 1269327)
      args = JSON.parse(JSON.stringify(args));
      port.postMessage({eventName, args});
    };

    port.onMessage.addListener(message =>
    {
      emit(target, message.eventName, ...message.args);
    });

    emit(page, "connect", target);
  }
});

module.exports = page;
