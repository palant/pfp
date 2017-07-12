/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {EventTarget, emit} = require("./eventTarget");

let ports = new Map();

exports.getPort = function(name)
{
  if (!ports.has(name))
  {
    let targets = [];
    let wrapper = EventTarget();

    browser.runtime.onConnect.addListener(function(port)
    {
      if (name == "*" || port.name == name)
      {
        targets.push(port);

        port.onDisconnect.addListener(port =>
        {
          let index = targets.indexOf(port);
          if (index >= 0)
            targets.splice(index, 1);
          emit(wrapper, "disconnect");
        });

        port.onMessage.addListener(message =>
        {
          emit(wrapper, message.eventName, ...message.args);
        });

        emit(wrapper, "connect");
      }
    });

    wrapper.emit = function(eventName, ...args)
    {
      for (let target of targets)
        target.postMessage({eventName, args});
    };

    ports.set(name, wrapper);
  }

  return ports.get(name);
};
