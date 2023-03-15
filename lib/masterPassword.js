/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {EventTarget, emit} from "./eventTarget.js";
import prefs, {getPref} from "./prefs.js";
import storage, {
  CURRENT_FORMAT, formatKey, saltKey, hmacSecretKey, setKeyCallback,
  setHmacSecretCallback
} from "./storage.js";
import {
  deriveKey, generateRandom, exportKey, importKey, importHmacSecret
} from "./crypto.js";
import {
  setMasterPasswordCallback, STORAGE_PREFIX, setPassword, setSite
} from "./passwords.js";
import {locked} from "./lock.js";

let lockTimer = null;
let autoLockSuspended = false;

const events = new EventTarget();
export default events;

async function serializeKey(key)
{
  let buffer = await exportKey(key);
  return [].map.call(new Uint8Array(buffer), el => el);
}

function deserializeKey(arr)
{
  return importKey(Uint8Array.from(arr));
}

// Expose state via callbacks to avoid circular dependencies
setMasterPasswordCallback(getMasterPassword);
setKeyCallback(getKey);
setHmacSecretCallback(getHmacSecret);

export async function getState()
{
  let {rememberedMaster} = await browser.storage.session.get("rememberedMaster");
  if (rememberedMaster)
    return "known";

  if (await storage.has(hmacSecretKey))
    return "set";
  else
    return "unset";
}

export async function getMasterPassword()
{
  let {rememberedMaster} = await browser.storage.session.get("rememberedMaster");
  if (!rememberedMaster)
    throw "master_password_required";

  return rememberedMaster;
}

export async function getKey()
{
  let {key} = await browser.storage.session.get("key");
  return key ? await deserializeKey(key) : null;
}

async function getHmacSecret()
{
  let hmacSecret = await storage.get(hmacSecretKey);
  return hmacSecret ? await importHmacSecret(hmacSecret) : null;
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
      forgetPassword();
    else
      lockTimer = setTimeout(forgetPassword, autolock_delay * 60 * 1000);
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
  if (!masterPassword)
  {
    let {rememberedMaster} = await browser.storage.session.get("rememberedMaster");
    masterPassword = rememberedMaster;
  }
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
  await Promise.all([
    storage.set(formatKey, CURRENT_FORMAT, null),
    storage.set(saltKey, salt, null),
    storage.set(hmacSecretKey, rawHmacSecret, newKey)
  ]);

  await browser.storage.session.set({
    rememberedMaster: masterPassword,
    key: await serializeKey(newKey)
  });
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

    // Check whether the key can decrypt our data
    await storage.get(hmacSecretKey, newKey);

    await browser.storage.session.set({
      rememberedMaster: masterPassword,
      key: await serializeKey(newKey)
    });
  }
  catch (e)
  {
    throw "declined";
  }
}

export async function forgetPassword()
{
  await browser.storage.session.remove(["rememberedMaster", "key"]);
}

export async function rekey(salt, rawHmacSecret, newKey)
{
  let entries = await storage.getAllByPrefix(STORAGE_PREFIX);
  await Promise.all([
    storage.set(saltKey, salt, null),
    storage.set(hmacSecretKey, rawHmacSecret, newKey),
    storage.delete(Object.keys(entries))
  ]);

  await browser.storage.session.set({
    key: await serializeKey(newKey)
  });

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
