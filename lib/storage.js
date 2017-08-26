/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let {generateSalt, deriveKey, encryptData, decryptData} = require("./crypto");

function encrypt(data, key)
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = require("./masterPassword").getKey();

    if (!key)
      return data;

    return encryptData(key, JSON.stringify(data));
  });
}

function decrypt(data, key)
{
  return Promise.resolve().then(() =>
  {
    if (typeof key == "undefined")
      key = require("./masterPassword").getKey();

    if (!key)
      return data;

    return decryptData(key, data).then(plaintext =>
    {
      return JSON.parse(plaintext);
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

    return decrypt(items[name], key);
  });
}
exports.get = get;

function getAllByPrefix(prefix, key)
{
  return browser.storage.local.get(null).then(items =>
  {
    let result = {};
    let names = Object.keys(items).filter(name => name.startsWith(prefix));
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
  return encrypt(value, key).then(ciphertext =>
  {
    return browser.storage.local.set({[name]: ciphertext});
  });
}
exports.set = set;

function delete_(name)
{
  return browser.storage.local.remove(name);
}
exports.delete = delete_;

function deleteByPrefix(prefix)
{
  return browser.storage.local.get(null).then(items =>
  {
    let keys = Object.keys(items).filter(name => name.substr(0, prefix.length) == prefix);
    return delete_(keys);
  });
}
exports.deleteByPrefix = deleteByPrefix;
