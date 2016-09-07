/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let prefs = require("prefs");
let storage = require("storage");

let {derivePassword} = require("./crypto");

const hashParams = {
  domain: "",
  length: 2,
  lower: true,
  upper: false,
  number: false,
  symbol: false
};

let rememberedMaster = null;
let lockTimer = null;
let autoLockSuspended = false;

Object.defineProperty(exports, "state", {
  enumerable: true,
  get: () =>
  {
    return new Promise((resolve, reject) =>
    {
      if (rememberedMaster)
        resolve("known");
      else
      {
        resolve(storage.get("masterPassword").then(value =>
        {
          return value ? "set" : "unset";
        }));
      }
    });
  }
});

exports.get = () => rememberedMaster;

function _suspendAutoLock()
{
  if (lockTimer !== null)
    clearTimeout(lockTimer);
  lockTimer = null;
}

function suspendAutoLock()
{
  _suspendAutoLock();
  autoLockSuspended = true;
}
exports.suspendAutoLock = suspendAutoLock;

function _resumeAutoLock()
{
  if (prefs.values.autolock)
  {
    if (prefs.values.autolock_delay <= 0)
      forgetPassword();
    else
      lockTimer = setTimeout(forgetPassword, prefs.values.autolock_delay * 60 * 1000);
  }
}

function resumeAutoLock()
{
  _suspendAutoLock();
  _resumeAutoLock();
  autoLockSuspended = false;
}
exports.resumeAutoLock = resumeAutoLock;

prefs.on("autolock", () =>
{
  if (prefs.values.autolock)
  {
    if (!autoLockSuspended)
      _resumeAutoLock();
  }
  else
    _suspendAutoLock();
});

function changePassword(masterPassword)
{
  let params = Object.assign({
    masterPassword,
    name: ""
  }, hashParams);
  return derivePassword(params).then(([hash, salt]) =>
  {
    storage.set("masterPassword", {hash, salt});
    require("./passwords").removeAll();
    rememberedMaster = masterPassword;
  });
}
exports.changePassword = changePassword;

function checkPassword(masterPassword)
{
  return storage.get("masterPassword").then(value =>
  {
    if (!value)
      throw "declined";

    let {hash, salt} = value;
    let params = Object.assign({
      masterPassword,
      name: salt
    }, hashParams);
    return Promise.all([derivePassword(params), hash]);
  }).then(([[hash, salt], expected]) =>
  {
    if (hash == expected)
      rememberedMaster = masterPassword;
    else
      throw "declined";
  });
}
exports.checkPassword = checkPassword;

function forgetPassword()
{
  return new Promise((resolve, reject) =>
  {
    rememberedMaster = null;
    resolve();
  });
}
exports.forgetPassword = forgetPassword;
