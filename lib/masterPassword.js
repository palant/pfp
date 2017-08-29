/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let prefs = require("./prefs");
let storage = require("./storage");

let crypto = require("./crypto");

const saltKey = exports.saltKey = "salt";
const hmacSecretKey = exports.hmacSecretKey = "hmac-secret";

let rememberedMaster = null;
let key = null;
let hmacSecret = null;
let lockTimer = null;
let autoLockSuspended = false;

Object.defineProperty(exports, "state", {
  enumerable: true,
  get: () =>
  {
    if (rememberedMaster)
      return Promise.resolve("known");

    return storage.has(hmacSecretKey).then(value =>
    {
      return value ? "set" : "unset";
    });
  }
});

exports.get = () =>
{
  if (!rememberedMaster)
    throw "master-password-required";

  return rememberedMaster;
};

function getKey()
{
  if (!key)
    throw "master-password-required";

  return key;
}

exports.encrypt = (data, key) =>
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    return crypto.encryptData(key, JSON.stringify(data));
  });
};

exports.decrypt = (data, key) =>
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    return crypto.decryptData(key, data).then(plaintext =>
    {
      return JSON.parse(plaintext);
    });
  });
};

exports.getDigest = data =>
{
  if (!hmacSecret)
    return Promise.reject("master-password-required");

  return crypto.getDigest(hmacSecret, data);
};

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
  Promise.all([
    prefs.get("autolock", true),
    prefs.get("autolock_delay", 10)
  ]).then(([autolock, autolock_delay]) =>
  {
    if (autolock)
    {
      if (autolock_delay <= 0)
        forgetPassword();
      else
        lockTimer = setTimeout(forgetPassword, autolock_delay * 60 * 1000);
    }
  });
}

function resumeAutoLock()
{
  _suspendAutoLock();
  _resumeAutoLock();
  autoLockSuspended = false;
}
exports.resumeAutoLock = resumeAutoLock;

prefs.on("autolock", (name, value) =>
{
  if (value)
  {
    if (!autoLockSuspended)
      _resumeAutoLock();
  }
  else
    _suspendAutoLock();
});

function changePassword(masterPassword)
{
  let salt = crypto.generateRandom(16);
  return crypto.deriveKey({masterPassword, salt}).then(newKey =>
  {
    return require("./passwords").removeAll().then(() =>
    {
      let rawHmacSecret = crypto.generateRandom(32);
      return Promise.all([
        crypto.importHmacSecret(rawHmacSecret),
        storage.set(saltKey, salt, null),
        storage.set(hmacSecretKey, rawHmacSecret, newKey)
      ]);
    }).then(([newHmacSecret]) =>
    {
      rememberedMaster = masterPassword;
      key = newKey;
      hmacSecret = newHmacSecret;
    });
  });
}
exports.changePassword = changePassword;

function checkPassword(masterPassword)
{
  return storage.get(saltKey, null).then(salt =>
  {
    if (!salt)
      return Promise.reject();

    return crypto.deriveKey({masterPassword, salt});
  }).then(newKey =>
  {
    return storage.get(hmacSecretKey, newKey).then(rawHmacSecret =>
    {
      return crypto.importHmacSecret(rawHmacSecret);
    }).then(newHmacSecret =>
    {
      rememberedMaster = masterPassword;
      key = newKey;
      hmacSecret = newHmacSecret;
    });
  }).catch(e =>
  {
    throw "declined";
  });
}
exports.checkPassword = checkPassword;

function forgetPassword()
{
  rememberedMaster = null;
  key = null;
  hmacSecret = null;
  return Promise.resolve();
}
exports.forgetPassword = forgetPassword;
