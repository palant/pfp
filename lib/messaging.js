/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget, emit} from "./eventTarget.js";

const {runtime} = (window.browser || window.chrome);

export const port = EventTarget();

runtime.onMessage.addListener((message, sender, sendResponse) =>
{
  (async function()
  {
    try
    {
      let result = await emit(port, message.eventName, ...message.args);
      sendResponse(result.find(element => typeof element != "undefined"));
    }
    catch (error)
    {
      console.error(error);
      sendResponse(undefined);
    }
  })();
  return true;
});

port.emit = async function(eventName, ...args)
{
  return new Promise(resolve =>
  {
    runtime.sendMessage({
      eventName,
      args
    }, resolve);
  });
};
