/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {getPort} from "../lib/messaging.js";

const port = getPort("proxy");

let errorHandlers = new Map();
let currentHandlers = new Map();

async function sendMessage(message)
{
  // Unwrap any Vue reactive objects
  for (let i = 0; i < message.args.length; i++)
    if (message.args[i] && typeof message.args[i].__v_raw != "undefined")
      message.args[i] = message.args[i].__v_raw;

  try
  {
    return await port.emit("call", message);
  }
  catch (error)
  {
    let handler = errorHandlers.get(error);
    if (handler)
    {
      let promise = currentHandlers.get(error);
      if (!promise)
      {
        promise = handler(error, message).then(() =>
        {
          currentHandlers.delete(error);
        }).catch(e =>
        {
          currentHandlers.delete(error);
          throw e;
        });
        currentHandlers.set(error, promise);
      }

      // Have the handler deal with the error and retry.
      await promise;
      return await sendMessage(message);
    }
    else
      throw error;
  }
}

function proxy(moduleName, methods)
{
  let proxy = {};

  for (let i = 0; i < methods.length; i++)
  {
    let method = methods[i];
    proxy[method] = (...args) => sendMessage({moduleName, method, args});
  }

  return proxy;
}

export function setErrorHandler(error, handler)
{
  errorHandlers.set(error, handler);
}

export const passwords = proxy("passwords", [
  "exportPasswordData", "importPasswordData", "getPasswords", "addAlias",
  "removeAlias", "addGenerated", "addStored", "removePassword", "getPassword",
  "setNotes", "getAllPasswords", "getAllSites"
]);

export const masterPassword = proxy("masterPassword", [
  "getState", "changePassword", "checkPassword", "forgetPassword", "startAutoLock"
]);

export const passwordRetrieval = proxy("passwordRetrieval", [
  "fillIn"
]);

export const prefs = proxy("prefs", ["getPref", "setPref"]);

export const recoveryCodes = proxy("recoveryCodes", [
  "getValidChars", "getCode", "formatCode", "isValid", "decodeCode"
]);

export const sync = proxy("sync", [
  "authorize", "getManualAuthURL", "manualAuthorization", "disableSync", "sync",
  "getSyncData", "isSyncing"
]);

export const ui = proxy("ui", [
  "getCurrentHost", "isDeprecationAccepted", "acceptDeprecation", "showAllPasswords", "getLink", "openLink"
]);
