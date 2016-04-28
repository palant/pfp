/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

exports.Page = function(options)
{
  let result = Object.create(exports.Page.prototype);
  result.port = EventTarget();

  let target = null;
  chrome.runtime.onConnect.addListener(function(port)
  {
    if (port.name == "worker")
    {
      target = port;

      port.onMessage.addListener(message =>
      {
        emit(result.port, message.eventName, ...message.args);
      });
    }
  });

  result.port.emit = function(eventName, ...args)
  {
    if (target)
      target.postMessage({eventName, args});
  };

  let frame = document.createElement("iframe");
  document.body.appendChild(frame);
  frame.src = options.contentURL;

  return result;
};
