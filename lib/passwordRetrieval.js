/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let utils = require("./ui/utils");
let passwords = require("./passwords");

function fillIn(site, name)
{
  return passwords.getPassword(site, name).then(password =>
  {
    return Promise.all([password, utils.getCurrentHost()]);
  }).then(([password, currentHost]) =>
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
exports.fillIn = fillIn;

function copyToClipboard(site, name)
{
  return passwords.getPassword(site, name).then(password =>
  {
    require("clipboard").set(password);
  });
}
exports.copyToClipboard = copyToClipboard;
