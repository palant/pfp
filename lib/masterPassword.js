/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {EventTarget, emit} from "./eventTarget.js";
import prefs, {getPref} from "./prefs.js";
import storage, {
  CURRENT_FORMAT, formatKey, saltKey, hmacSecretKey, setKeyCallback,
  setHmacSecretCallback
} from "./storage.js";
import {deriveKey, generateRandom, importHmacSecret} from "./crypto.js";
import {
  setMasterPasswordCallback, STORAGE_PREFIX, setPassword, setSite
} from "./passwords.js";
import {locked} from "./lock.js";

let rememberedMaster = null;
let key = null;
let hmacSecret = null;
let lockTimer = null;
let autoLockSuspended = false;

const events = new EventTarget();
export default events;

// Expose state via callbacks to avoid circular dependencies
setMasterPasswordCallback(getMasterPassword);
setKeyCallback(() => key);
setHmacSecretCallback(() => hmacSecret);

let rememberedKeys = null;

export function getKeys()
{
  return rememberedKeys;
}

export function rememberKeys(keys)
{
  rememberedKeys = keys;
}

export function forgetKeys()
{
  rememberedKeys = null;
}

export async function getState()
{
  if (rememberedMaster)
    return "known";

  if (await storage.has(hmacSecretKey))
    return "set";
  else
    return "unset";
}

export function getMasterPassword()
{
  if (!rememberedMaster)
    throw "master_password_required";

  return rememberedMaster;
}

export async function getSalt()
{
  return await storage.get(saltKey, null);
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

async function _resumeAutoLock()
{
  let [autolock, autolock_delay] = await Promise.all([
    getPref("autolock", true),
    getPref("autolock_delay", 10)
  ]);

  if (autolock)
  {
    if (autolock_delay <= 0)
      forgetKeys();
    else
      lockTimer = setTimeout(forgetKeys, autolock_delay * 60 * 1000);
  }
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

export async function deriveKeyWithPassword(salt, masterPassword)
{
  if (!masterPassword && rememberedMaster)
    masterPassword = rememberedMaster;
  if (!masterPassword)
    throw "master_password_required";

  let key = await deriveKey({masterPassword, salt});
  return key;
}

async function clearDataNoLock()
{
  await storage.clear();
}
const clearData = locked(clearDataNoLock);

export async function changePassword(masterPassword, noLock)
{
  let salt = generateRandom(16);
  let newKey = await deriveKeyWithPassword(salt, masterPassword);

  await emit(events, "changingPassword", noLock);
  if (noLock)
    await clearDataNoLock();
  else
    await clearData();

  let rawHmacSecret = generateRandom(32);
  let [newHmacSecret] = await Promise.all([
    importHmacSecret(rawHmacSecret),
    storage.set(formatKey, CURRENT_FORMAT, null),
    storage.set(saltKey, salt, null),
    storage.set(hmacSecretKey, rawHmacSecret, newKey)
  ]);

  rememberedMaster = masterPassword;
  key = newKey;
  hmacSecret = newHmacSecret;
}

export async function checkPassword(masterPassword)
{
  let [format, salt] = await Promise.all([
    storage.get(formatKey, null),
    storage.get(saltKey, null)
  ]);

  try
  {
    if (format !== CURRENT_FORMAT)
      throw null;

    if (!salt)
      throw null;

    let newKey = await deriveKeyWithPassword(salt, masterPassword);
    let rawHmacSecret = await storage.get(hmacSecretKey, newKey);
    let newHmacSecret = await importHmacSecret(rawHmacSecret);

    rememberedMaster = masterPassword;
    key = newKey;
    hmacSecret = newHmacSecret;
  }
  catch (e)
  {
    throw "declined";
  }
}

export async function forgetPassword()
{
  rememberedMaster = null;
  key = null;
  hmacSecret = null;
}

export async function rekey(salt, rawHmacSecret, newKey)
{
  let entries = await storage.getAllByPrefix(STORAGE_PREFIX);
  let [newHmacSecret] = await Promise.all([
    importHmacSecret(rawHmacSecret),
    storage.set(saltKey, salt, null),
    storage.set(hmacSecretKey, rawHmacSecret, newKey),
    storage.delete(Object.keys(entries))
  ]);

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
  await Promise.all(actions);
}
