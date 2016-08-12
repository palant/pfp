/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("platform");

let maxMessageId = 0;
function sendMessage(message)
{
  return new Promise((resolve, reject) =>
  {
    let messageId = message.messageId = ++maxMessageId;
    port.once("_proxyResponse-" + messageId, ([error, result]) =>
    {
      if (error)
        reject(error);
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

exports.passwords = Proxy("passwords", [
  "importPasswordData", "getPasswords", "addAlias", "removeAlias",
  "addGenerated", "addLegacy", "removePassword"
]);

exports.masterPassword = Proxy("masterPassword", [
  "changePassword", "checkPassword", "forgetPassword"
]);

exports.passwordRetrieval = Proxy("passwordRetrieval", [
  "fillIn", "copyToClipboard"
]);

exports.ui = Proxy("ui", ["showAllPasswords"]);
