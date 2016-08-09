/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let utils = require("./utils");
let passwords = require("../passwords");

function fillIn(site, password)
{
  return utils.getCurrentHost().then(currentHost =>
  {
    let [_, currentSite] = passwords.getAlias(currentHost);
    if (currentSite != site)
      return Promise.reject("wrong-site-message");

    return require("tabs").executeScript("fillIn.js", {
      host: currentHost,
      password: password
    });
  }).then(port =>
  {
    return new Promise((resolve, reject) =>
    {
      port.on("success", () =>
      {
        port.disconnect();
        resolve();
      });
      port.on("failure", () =>
      {
        port.disconnect();
        reject("no-password-fields");
      });
    });
  });
}

module.exports = function(panel)
{
  panel.port.on("fillIn", ({site, name}) =>
  {
    passwords.getPassword(site, name).then(password =>
    {
      return fillIn(site, password).then(() =>
      {
        panel.hide();
      });
    }).catch(reason =>
    {
      if (typeof reason == "string")
        panel.port.emit("fillInFailed", reason);
      else
        console.error(reason);
    });
  });

  panel.port.on("copyToClipboard", ({site, name}) =>
  {
    passwords.getPassword(site, name).then(password =>
    {
      require("clipboard").set(password);
      panel.port.emit("passwordCopied");
    }).catch(reason =>
    {
      if (typeof reason == "string")
        panel.port.emit("passwordCopyFailed", reason);
      else
        console.error(reason);
    });
  });
};
