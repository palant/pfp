/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget, emit} from "./eventTarget";
import prefs, {getPref} from "./prefs";
import storage, {
  CURRENT_FORMAT, formatKey, saltKey, hmacSecretKey, setKeyCallback,
  setHmacSecretCallback
} from "./storage";
import {deriveKey, generateRandom, importHmacSecret} from "./crypto";
import {
  lock, isMigrating, migrateData, STORAGE_PREFIX, setPassword, setSite
} from "./passwords";

let rememberedMaster = null;
let key = null;
let hmacSecret = null;
let lockTimer = null;
let autoLockSuspended = false;

const events = new EventTarget();
export default events;

setKeyCallback(() => key);
setHmacSecretCallback(() => hmacSecret);

export function getState()
{
  if (isMigrating())
    return Promise.resolve("migrating");

  if (rememberedMaster)
    return Promise.resolve("known");

  return storage.has(hmacSecretKey).then(value =>
  {
    return value ? "set" : "unset";
  });
}

export function getMasterPassword()
{
  if (!rememberedMaster)
    throw "master_password_required";

  return rememberedMaster;
}

export function getSalt()
{
  return storage.get(saltKey, null);
}

function _suspendAutoLock()
{
  if (lockTimer !== null)
    clearTimeout(lockTimer);
  lockTimer = null;
}

export function suspendAutoLock()
{
  _suspendAutoLock();
  autoLockSuspended = true;
}

function _resumeAutoLock()
{
  Promise.all([
    getPref("autolock", true),
    getPref("autolock_delay", 10)
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

export function resumeAutoLock()
{
  _suspendAutoLock();
  _resumeAutoLock();
  autoLockSuspended = false;
}

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

export function deriveKeyWithPassword(salt, masterPassword)
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
    return deriveKey({masterPassword, salt});
  });
}

function clearData(noLock)
{
  return (noLock ? Promise.resolve() : lock.acquire()).then(() =>
  {
    return storage.clear();
  }).finally(() => noLock || lock.release());
}

export function changePassword(masterPassword, noLock)
{
  let salt = generateRandom(16);
  return deriveKeyWithPassword(salt, masterPassword).then(newKey =>
  {
    return emit(events, "changingPassword", noLock).then(() =>
    {
      return clearData(noLock);
    }).then(() =>
    {
      let rawHmacSecret = generateRandom(32);
      return Promise.all([
        importHmacSecret(rawHmacSecret),
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

export function checkPassword(masterPassword)
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

    return deriveKeyWithPassword(salt, masterPassword);
  }).then(newKey =>
  {
    return storage.get(hmacSecretKey, newKey).then(rawHmacSecret =>
    {
      return importHmacSecret(rawHmacSecret);
    }).then(newHmacSecret =>
    {
      rememberedMaster = masterPassword;
      key = newKey;
      hmacSecret = newHmacSecret;

      if (needsMigrating)
      {
        migrateData(masterPassword).catch(e => console.error(e));
        throw "migrating";
      }
    });
  }).catch(e =>
  {
    throw e == "migrating" ? e : "declined";
  });
}

export function forgetPassword()
{
  rememberedMaster = null;
  key = null;
  hmacSecret = null;
  return Promise.resolve();
}

export function rekey(salt, rawHmacSecret, newKey)
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(entries =>
  {
    return Promise.all([
      entries,
      importHmacSecret(rawHmacSecret),
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
        actions.push(setPassword(value));
      else
        actions.push(setSite(value));
    }
    return Promise.all(actions);
  });
}
