/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let sp = require("sdk/simple-prefs");
let {storage} = require("sdk/simple-storage");
let {setTimeout, clearTimeout} = require("sdk/timers");
let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

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

let exports = module.exports = EventTarget();

Object.defineProperty(exports, "state", {
  enumerable: true,
  get: () => {
    if (rememberedMaster)
      return "known";
    else if ("masterPasswordHash" in storage)
      return "set";
    else
      return "unset";
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
  if (sp.prefs.autolock)
  {
    if (sp.prefs.autolock_delay <= 0)
      forgetPassword();
    else
      lockTimer = setTimeout(forgetPassword, sp.prefs.autolock_delay * 60 * 1000);
  }
}

function resumeAutoLock()
{
  _suspendAutoLock();
  _resumeAutoLock();
  autoLockSuspended = false;
}
exports.resumeAutoLock = resumeAutoLock;

sp.on("autolock", () => {
  if (sp.prefs.autolock)
  {
    if (!autoLockSuspended)
      _resumeAutoLock();
  }
  else
    _suspendAutoLock();
});

function changePassword(masterPassword)
{
  return new Promise((resolve, reject) => {
    let params = Object.assign({
      masterPassword,
      name: ""
    }, hashParams);
    derivePassword(params, function([hash, salt])
    {
      storage.masterPasswordSalt = salt;
      storage.masterPasswordHash = hash;
      delete storage.sites;
      rememberedMaster = masterPassword;
      resolve();
    });
  });
}
exports.changePassword = changePassword;

function checkPassword(masterPassword)
{
  return new Promise((resolve, reject) => {
    let params = Object.assign({
      masterPassword,
      name: storage.masterPasswordSalt
    }, hashParams);
    derivePassword(params, function([hash, salt])
    {
      if (hash == storage.masterPasswordHash)
      {
        rememberedMaster = masterPassword;
        resolve();
      }
      else
        reject("declined");
    });
  });
}
exports.checkPassword = checkPassword;

function forgetPassword()
{
  return new Promise((resolve, reject) => {
    if (!rememberedMaster)
      reject();

    rememberedMaster = null;
    resolve();
    emit(exports, "forgotten");
  });
}
exports.forgetPassword = forgetPassword;
