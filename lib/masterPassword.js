/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let prefs = require("./prefs");
let storage = require("./storage");

let crypto = require("./crypto");

const CURRENT_FORMAT = 3;
const formatKey = exports.formatKey = "format";
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
    if (require("./passwords").isMigrating())
      return Promise.resolve("migrating");

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
    throw "master_password_required";

  return rememberedMaster;
};

exports.getSalt = () =>
{
  return storage.get(saltKey, null);
};

function getKey()
{
  if (!key)
    throw "master_password_required";

  return key;
}

exports.encrypt = (data, key, json) =>
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    if (json !== false)
      data = JSON.stringify(data);
    return crypto.encryptData(key, data);
  });
};

exports.decrypt = (data, key, json) =>
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    return crypto.decryptData(key, data).then(plaintext =>
    {
      if (json !== false)
        plaintext = JSON.parse(plaintext);
      return plaintext;
    });
  });
};

exports.getDigest = data =>
{
  if (!hmacSecret)
    return Promise.reject("master_password_required");

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

function deriveKey(salt, masterPassword)
{
  return Promise.resolve().then(() =>
  {
    if (masterPassword)
      return masterPassword;
    if (rememberedMaster)
      return rememberedMaster;
    throw "master_password_required";
  }).then(masterPassword =>
  {
    return crypto.deriveKey({masterPassword, salt});
  });
}
exports.deriveKey = deriveKey;

function clearData(noLock)
{
  let {lock} = require("./passwords");
  return (noLock ? Promise.resolve() : lock.acquire()).then(() =>
  {
    return storage.clear();
  }).finally(() => noLock || lock.release());
}

function changePassword(masterPassword, noLock)
{
  let salt = crypto.generateRandom(16);
  return deriveKey(salt, masterPassword).then(newKey =>
  {
    // Disable sync before clearing data, otherwise it will create change
    // entries for everything removed.
    return require("./sync").disable(noLock).then(() =>
    {
      return clearData(noLock);
    }).then(() =>
    {
      let rawHmacSecret = crypto.generateRandom(32);
      return Promise.all([
        crypto.importHmacSecret(rawHmacSecret),
        storage.set(formatKey, CURRENT_FORMAT, null),
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
  let needsMigrating = false;

  return Promise.all([
    storage.get(formatKey, null),
    storage.get(saltKey, null)
  ]).then(([format, salt]) =>
  {
    if (format && format != CURRENT_FORMAT)
      return Promise.reject();
    if (!format)
      needsMigrating = true;

    if (!salt)
      return Promise.reject();

    return deriveKey(salt, masterPassword);
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

      if (needsMigrating)
      {
        require("./passwords").migrateData(masterPassword).catch(e => console.error(e));
        throw "migrating";
      }
    });
  }).catch(e =>
  {
    throw e == "migrating" ? e : "declined";
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

function rekey(salt, rawHmacSecret, newKey)
{
  let passwords = require("./passwords");
  let prefix = passwords.STORAGE_PREFIX;
  return storage.getAllByPrefix(prefix).then(entries =>
  {
    return Promise.all([
      entries,
      crypto.importHmacSecret(rawHmacSecret),
      storage.set(saltKey, salt, null),
      storage.set(hmacSecretKey, rawHmacSecret, newKey),
      storage.delete(Object.keys(entries))
    ]);
  }).then(([entries, newHmacSecret]) =>
  {
    key = newKey;
    hmacSecret = newHmacSecret;

    let actions = [];
    for (let key in entries)
    {
      let value = entries[key];
      if (value.type)
        actions.push(passwords.setPassword(value));
      else
        actions.push(passwords.setSite(value));
    }
    return Promise.all(actions);
  });
}
exports.rekey = rekey;
