/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {port} = require("buttonPanel");

port.on("_proxy", ({messageId, moduleName, method, args}) =>
{
  Promise.resolve().then(() =>
  {
    if (moduleName == "passwords")
      return require("./passwords");
    else if (moduleName == "masterPassword")
      return require("./masterPassword");
    else if (moduleName == "passwordRetrieval")
      return require("./passwordRetrieval");
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
    }
    port.emit("_proxyResponse-" + messageId, [error, null]);
  });
});
