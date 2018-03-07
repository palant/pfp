/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("./messaging");

let errorHandlers = new Map();
let currentHandlers = new Map();

let maxMessageId = 0;
function sendMessage(message)
{
  return new Promise((resolve, reject) =>
  {
    let messageId = message.messageId = port.name + ++maxMessageId;
    port.once("_proxyResponse-" + messageId, ([error, result]) =>
    {
      if (error)
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
          promise.then(() => sendMessage(message)).then(resolve, reject);
        }
        else
          reject(error);
      }
      else
        resolve(result);
    });
    port.emit("_proxy", message);
  });
}

function Proxy(moduleName, methods)
{
  let proxy = {};

  for (let i = 0; i < methods.length; i++)
  {
    let method = methods[i];
    proxy[method] = (...args) => sendMessage({moduleName, method, args});
  }

  return proxy;
}

exports.setErrorHandler = (error, handler) => errorHandlers.set(error, handler);

exports.passwords = Proxy("passwords", [
  "exportPasswordData", "importPasswordData", "getPasswords", "addAlias",
  "removeAlias", "addGenerated", "addStored", "removePassword", "getPassword",
  "setNotes", "getAllPasswords", "getAllSites", "isMigrating"
]);

exports.masterPassword = Proxy("masterPassword", [
  "changePassword", "checkPassword", "forgetPassword"
]);

exports.passwordRetrieval = Proxy("passwordRetrieval", [
  "fillIn", "copyToClipboard"
]);

exports.prefs = Proxy("prefs", ["get", "set"]);

exports.recoveryCodes = Proxy("recoveryCodes", [
  "getValidChars", "getCode", "formatCode", "isValid", "decodeCode"
]);

exports.sync = Proxy("sync", [
  "authorize", "getManualAuthURL", "manualAuthorization", "disable", "sync"
]);

exports.ui = Proxy("ui", ["showAllPasswords", "getLink", "openLink"]);
