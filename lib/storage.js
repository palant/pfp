/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI";
import {deriveKey, encryptData, decryptData} from "./crypto";
import {EventTarget, emit} from "./eventTarget";

const prefsPrefix = "pref:";

let keyCallback = null;
export function setKeyCallback(callback)
{
  keyCallback = callback;
}

function getKey()
{
  let key = keyCallback && keyCallback();
  if (!key)
    throw "master_password_required";

  return key;
}

export function encrypt(data, key, json)
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    if (json !== false)
      data = JSON.stringify(data);
    return encryptData(key, data);
  });
}

export function decrypt(data, key, json)
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = getKey();

    if (!key)
      return data;

    return decryptData(key, data).then(plaintext =>
    {
      if (json !== false)
        plaintext = JSON.parse(plaintext);
      return plaintext;
    });
  });
}

function has(name)
{
  return browser.storage.local.get(name).then(items =>
  {
    return items.hasOwnProperty(name);
  });
}

function hasPrefix(prefix)
{
  return browser.storage.local.get(null).then(items =>
  {
    return Object.keys(items).some(name => name.startsWith(prefix));
  });
}

function get(name, key)
{
  return browser.storage.local.get(name).then(items =>
  {
    if (!items.hasOwnProperty(name))
      return undefined;

    return decrypt(items[name], key);
  });
}

function getAllByPrefix(prefix, key)
{
  return browser.storage.local.get(null).then(items =>
  {
    let result = {};
    let names = Object.keys(items).filter(name => name.startsWith(prefix) && !name.startsWith(prefsPrefix));
    let decryptNextName = () =>
    {
      if (!names.length)
        return result;

      let name = names.pop();
      return decrypt(items[name], key).then(plaintext =>
      {
        result[name] = plaintext;
        return decryptNextName();
      });
    };
    return decryptNextName();
  });
}

function set(name, value, key)
{
  return encrypt(value, key).then(ciphertext =>
  {
    return browser.storage.local.set({[name]: ciphertext});
  }).then(() =>
  {
    return emit(storage, "set", name);
  });
}

function delete_(name)
{
  return browser.storage.local.remove(name).then(() =>
  {
    if (Array.isArray(name))
      return Promise.all(name.map(n => emit(storage, "delete", n)));
    else
      return emit(storage, "delete", name);
  });
}

function deleteByPrefix(prefix)
{
  return browser.storage.local.get(null).then(items =>
  {
    let keys = Object.keys(items).filter(name => name.startsWith(prefix));
    return delete_(keys);
  });
}

function clear()
{
  return browser.storage.local.get(null).then(items =>
  {
    let keys = Object.keys(items).filter(name => !name.startsWith(prefsPrefix));
    return delete_(keys);
  });
}

let storage = Object.assign(EventTarget(), {
  has, hasPrefix, get, getAllByPrefix, set, delete: delete_, deleteByPrefix,
  clear
});
export default storage;
