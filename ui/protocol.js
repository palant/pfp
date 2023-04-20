/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "../lib/browserAPI.js";

export const PROTOCOL_VERSION = "1.0";

let port = null;
let responseQueue = null;

function connect()
{
  port = browser.runtime.connectNative("works.pfp.pfp_native_host");
  responseQueue = new Map();
  port.onDisconnect.addListener(() =>
  {
    let error = new Error(chrome.runtime.lastError.message);
    error.name = "NativeHostDisconnect";
    console.error(error);

    for (let [, reject] of responseQueue.values())
      reject(error);

    port = null;
    responseQueue = null;
  });
  port.onMessage.addListener(onMessage);
}

async function onMessage(message)
{
  let queued = responseQueue.get(message.requestId);
  if (!queued)
  {
    console.error("Received response not matching any request", message);
    return;
  }

  let [resolve, reject] = queued;
  responseQueue.delete(message.requestId);
  if (message.success)
    resolve(message.response);
  else
  {
    let error = new Error(message.response.error);
    error.name = message.response.errorCode;
    reject(error);
  }
}

export async function nativeRequest(action, request)
{
  if (!port)
    connect();

  let requestId = Math.random().toString().slice(2);
  let message = {
    requestId,
    action,
    request
  };

  port.postMessage(message);

  return await new Promise((resolve, reject) =>
  {
    responseQueue.set(requestId, [resolve, reject]);
  });
}
