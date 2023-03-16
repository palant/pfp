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

function autoLock(alarm)
{
  if (alarm.name != "autolock")
    return;

  forgetPassword();
}
browser.alarms.onAlarm.addListener(autoLock);

export async function stopAutoLock()
{
  await browser.alarms.clear("autolock");
}

export async function startAutoLock()
{
  let [autolock, autolock_delay, {rememberedMaster}] = await Promise.all([
    getPref("autolock", true),
    getPref("autolock_delay", 10),
    browser.storage.session.get("rememberedMaster")
  ]);

  if (rememberedMaster && autolock)
  {
    autolock_delay = Math.max(parseInt(autolock_delay, 10) || 0, 1);
    await browser.alarms.create("autolock", {delayInMinutes: autolock_delay});
  }
}

prefs.on("autolock", async(name, value) =>
{
  if (value)
    await startAutoLock();
  else
    await stopAutoLock();
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

  startAutoLock();
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

    startAutoLock();
  }
  catch (e)
  {
    throw "declined";
  }
}

export async function forgetPassword()
{
  await browser.storage.session.remove(["rememberedMaster", "key"]);

  stopAutoLock();
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
