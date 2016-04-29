/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {data} = require("sdk/self");
let {Page} = require("sdk/page-worker");

let worker = Page({
  contentURL: data.url("cryptoWorker/cryptoWorker.html"),
  contentScriptFile: data.url("cryptoWorker/proxy.js")
});

let messageID = 0;

function derivePassword(params, callback)
{
  let responseMessage = "derivePassword-response" + ++messageID;
  worker.port.once(responseMessage, callback);
  worker.port.emit("derivePassword", {responseMessage, params});
}
exports.derivePassword = derivePassword;

function encryptPassword(params, callback)
{
  let responseMessage = "encryptPassword-response" + ++messageID;
  worker.port.once(responseMessage, callback);
  worker.port.emit("encryptPassword", {responseMessage, params});
}
exports.encryptPassword = encryptPassword;

function decryptPassword(params, callback)
{
  let responseMessage = "decryptPassword-response" + ++messageID;
  worker.port.once(responseMessage, callback);
  worker.port.emit("decryptPassword", {responseMessage, params});
}
exports.decryptPassword = decryptPassword;
