/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let storage = require("./storage");

Object.defineProperty(exports, "provider", {
  enumerable: true,
  get: () =>
  {
    return storage.get("syncData").then(value => value ? value.provider : null);
  }
});

exports.authorize = function()
{
  let provider = require("./sync-providers/dropbox");
  return provider.authorize().then(token =>
  {
    storage.set("syncData", {provider: "dropbox", token});
  });
};

exports.disable = function()
{
  return storage.delete("syncData");
};
