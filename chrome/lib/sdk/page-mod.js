/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

exports.PageMod = function({onAttach})
{
  chrome.runtime.onConnect.addListener(function(port)
  {
    if (port.name == "pagemod")
    {
      let worker = {
        port: EventTarget()
      };

      worker.port.emit = function (eventName, ...args)
      {
        port.postMessage({eventName, args});
      };

      port.onMessage.addListener(message =>
      {
        emit(worker.port, message.eventName, ...message.args);
      });

      onAttach(worker);
    }
  });
};
