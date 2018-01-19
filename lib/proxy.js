/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let port = require("./messaging").getPort("*");
port.on("_proxy", handleMessage);

function handleMessage({messageId, moduleName, method, args})
{
  Promise.resolve().then(() =>
  {
    if (moduleName == "passwords")
      return require("./passwords");
    else if (moduleName == "masterPassword")
      return require("./masterPassword");
    else if (moduleName == "passwordRetrieval")
      return require("./passwordRetrieval");
    else if (moduleName == "prefs")
      return require("./prefs");
    else if (moduleName == "recoveryCodes")
      return require("./recoveryCodes");
    else if (moduleName == "sync")
      return require("./sync");
    else if (moduleName == "ui")
      return require("./ui");
    else
      throw new Error("Unknown module");
  }).then(obj =>
  {
    return obj[method](...args);
  }).then(result =>
  {
    port.emit("_proxyResponse-" + messageId, [null, result]);
  }).catch(error =>
  {
    if (typeof error != "string")
    {
      console.error(error);
      if (error && error.stack)
        error = error + "\n" + error.stack;
      else
        error = String(error);
    }
    port.emit("_proxyResponse-" + messageId, [error, null]);
  });
}
