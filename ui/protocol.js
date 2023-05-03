/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {getPref, setPref} from "./prefs.js";

export const PROTOCOL_VERSION = "1.1";

let port = null;
let responseQueue = null;

function connect()
{
  port = browser.runtime.connectNative("works.pfp.pfp_native_host");
  responseQueue = new Map();
  port.onDisconnect.addListener(() =>
  {
    let error = new Error(chrome.runtime.lastError && chrome.runtime.lastError.message);
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
  // Error message without requestId is probably a parsing error, assign it to
  // the currently outstanding request.
  if (!message.requestId && !message.success && responseQueue.size == 1)
    message.requestId = responseQueue.keys().next().value;

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

  let database = await getDatabase();

  let requestId = Math.random().toString().slice(2);
  let message = {
    requestId,
    database,
    action,
    request
  };

  port.postMessage(message);

  return await new Promise((resolve, reject) =>
  {
    responseQueue.set(requestId, [resolve, reject]);
  });
}

export async function getDatabase()
{
  return await getPref("database", null);
}

export async function setDatabase(database)
{
  await setPref("database", database);
}
