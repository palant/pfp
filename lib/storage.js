/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {generateSalt, deriveKey} = require("./crypto");

const prefsPrefix = "pref:";

function has(name)
{
  return browser.storage.local.get(name).then(items =>
  {
    return items.hasOwnProperty(name);
  });
}
exports.has = has;

function hasPrefix(prefix)
{
  return browser.storage.local.get(null).then(items =>
  {
    return Object.keys(items).some(name => name.startsWith(prefix));
  });
}
exports.hasPrefix = hasPrefix;

function get(name, key)
{
  return browser.storage.local.get(name).then(items =>
  {
    if (!items.hasOwnProperty(name))
      return undefined;

    return require("./masterPassword").decrypt(items[name], key);
  });
}
exports.get = get;

function getAllByPrefix(prefix, key)
{
  return browser.storage.local.get(null).then(items =>
  {
    let {decrypt} = require("./masterPassword");
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
exports.getAllByPrefix = getAllByPrefix;

function set(name, value, key)
{
  return require("./masterPassword").encrypt(value, key).then(ciphertext =>
  {
    return browser.storage.local.set({[name]: ciphertext});
  }).then(() =>
  {
    triggerModificationListeners(name);
  });
}
exports.set = set;

function delete_(name)
{
  return browser.storage.local.remove(name).then(() =>
  {
    if (Array.isArray(name))
    {
      for (let n of name)
        triggerModificationListeners(n);
    }
    else
      triggerModificationListeners(name);
  });
}
exports.delete = delete_;

function deleteByPrefix(prefix)
{
  return browser.storage.local.get(null).then(items =>
  {
    let keys = Object.keys(items).filter(name => name.startsWith(prefix));
    return delete_(keys);
  });
}
exports.deleteByPrefix = deleteByPrefix;

function clear()
{
  return browser.storage.local.get(null).then(items =>
  {
    let keys = Object.keys(items).filter(name => !name.startsWith(prefsPrefix));
    return delete_(keys);
  });
}
exports.clear = clear;

let modificationListeners = [];
function triggerModificationListeners(key)
{
  for (let listener of modificationListeners)
    listener(key);
}

function addModificationListener(listener)
{
  modificationListeners.push(listener);
}
exports.addModificationListener = addModificationListener;

function removeModificationListener(listener)
{
  let index = modificationListeners.indexOf(listener);
  if (index >= 0)
    modificationListeners.splice(index, 1);
}
exports.removeModificationListener = removeModificationListener;
