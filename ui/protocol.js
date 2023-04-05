/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "../lib/browserAPI.js";

let port = null;
let responseQueue = null;

function connect()
{
  port = browser.runtime.connectNative("de.palant.kdbx_native_host");
  responseQueue = new Map();
  port.onDisconnect.addListener(() =>
  {
    port = null;
    responseQueue = null;
  });
  port.onMessage.addListener(onMessage);
}

async function onMessage(message)
{
  let queued = responseQueue.get(message.request_id);
  if (!queued)
  {
    console.error("Received response not matching any request", message);
    return;
  }

  let [resolve, reject] = queued;
  responseQueue.delete(message.request_id);
  if (message.success)
    resolve(message.response);
  else
  {
    let error = new Error(message.response.error);
    error.code = message.response.error_code;
    reject(error);
  }
}

export async function nativeRequest(action, request)
{
  if (!port)
    connect();

  let requestId = Math.random().toString().slice(2);
  let message = {
    request_id: requestId,
    [action]: request
  };

  port.postMessage(message);

  return await new Promise((resolve, reject) =>
  {
    responseQueue.set(requestId, [resolve, reject]);
  });
}
