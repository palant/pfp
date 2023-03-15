/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI.js";
import {deriveKey, encryptData, decryptData, getDigest} from "./crypto.js";
import {EventTarget, emit} from "./eventTarget.js";

export const CURRENT_FORMAT = 3;
export const formatKey = "format";
export const saltKey = "salt";
export const hmacSecretKey = "hmac-secret";
export const prefsPrefix = "pref:";

let keyCallback = null;
export function setKeyCallback(callback)
{
  keyCallback = callback;
}

let hmacSecretCallback = null;
export function setHmacSecretCallback(callback)
{
  hmacSecretCallback = callback;
}

async function getKey()
{
  let key = keyCallback && await keyCallback();
  if (!key)
    throw "master_password_required";

  return key;
}

export async function encrypt(data, key, json)
{
  if (typeof key == "undefined")
    key = await getKey();

  if (!key)
    return data;

  if (json !== false)
    data = JSON.stringify(data);
  return await encryptData(key, data);
}

export async function decrypt(data, key, json)
{
  if (typeof key == "undefined")
    key = await getKey();

  if (!key)
    return data;

  let plaintext = await decryptData(key, data);
  if (json !== false)
    plaintext = JSON.parse(plaintext);
  return plaintext;
}

export async function nameToStorageKey(data)
{
  let hmacSecret = hmacSecretCallback && await hmacSecretCallback();
  if (!hmacSecret)
    throw "master_password_required";

  return await getDigest(hmacSecret, data);
}

async function has(name)
{
  let items = await browser.storage.local.get(name);
  return items.hasOwnProperty(name);
}

async function hasPrefix(prefix)
{
  let items = await browser.storage.local.get(null);
  return Object.keys(items).some(name => name.startsWith(prefix));
}

async function get(name, key)
{
  let items = await browser.storage.local.get(name);
  if (!items.hasOwnProperty(name))
    return undefined;

  return await decrypt(items[name], key);
}

async function getAllByPrefix(prefix, key)
{
  let items = await browser.storage.local.get(null);
  let result = {};
  for (let name of Object.keys(items))
    if (name.startsWith(prefix) && !name.startsWith(prefsPrefix))
      result[name] = await decrypt(items[name], key);
  return result;
}

async function set(name, value, key)
{
  let ciphertext = await encrypt(value, key);
  await browser.storage.local.set({[name]: ciphertext});
  await emit(storage, "set", name);
}

async function delete_(name)
{
  await browser.storage.local.remove(name);
  let names = Array.isArray(name) ? name : [name];
  await Promise.all(names.map(n => emit(storage, "delete", n)));
}

async function deleteByPrefix(prefix)
{
  let items = await browser.storage.local.get(null);
  let keys = Object.keys(items).filter(name => name.startsWith(prefix));
  await delete_(keys);
}

async function clear()
{
  let items = await browser.storage.local.get(null);
  let keys = Object.keys(items).filter(name => !name.startsWith(prefsPrefix));
  await delete_(keys);
}

let storage = Object.assign(EventTarget(), {
  has, hasPrefix, get, getAllByPrefix, set, delete: delete_, deleteByPrefix,
  clear
});
export default storage;
