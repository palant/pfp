/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {EventTarget, emit} from "./eventTarget.js";

let ports = new Map();

export function getPort(name)
{
  if (!ports.has(name))
  {
    let port = EventTarget();

    port.emit = async function(eventName, ...args)
    {
      let response = await browser.runtime.sendMessage({name, eventName, args});
      if (response)
      {
        let [result, error] = response;
        if (error)
          throw error;
        return result;
      }
      return undefined;
    };

    ports.set(name, port);
  }

  return ports.get(name);
}

browser.runtime.onMessage.addListener(function({name, eventName, args}, sender, sendResponse)
{
  let port = ports.get(name);
  if (!port || !port.hasListeners(eventName))
    return false;

  (async function()
  {
    try
    {
      let responses = await emit(port, eventName, ...args);
      let response = responses.find(el => typeof el != "undefined");
      sendResponse([response, null]);
    }
    catch (error)
    {
      let stringified;
      if (typeof error == "string")
        stringified = error;
      else
      {
        console.error(error);
        if (error && error.stack)
          stringified = error + "\n" + error.stack;
        else
          stringified = String(error);
      }
      sendResponse([null, stringified]);
    }
  })();
  return true;
});
