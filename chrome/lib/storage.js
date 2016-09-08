/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

/* global chrome */

function promisify(handler)
{
  return new Promise((resolve, reject) =>
  {
    handler(result =>
    {
      if (chrome.runtime.lastError)
        reject(chrome.runtime.lastError);
      else
        resolve(result);
    });
  });
}

function get(name)
{
  return promisify(callback =>
  {
    chrome.storage.local.get(name, callback);
  }).then(items => items[name]);
}
exports.get = get;

function getAllByPrefix(prefix)
{
  return promisify(callback =>
  {
    chrome.storage.local.get(null, callback);
  }).then(items =>
  {
    let result = {};
    for (let name in items)
      if (name.substr(0, prefix.length) == prefix)
        result[name.substr(prefix.length)] = items[name];
    return result;
  });
}
exports.getAllByPrefix = getAllByPrefix;

function set(name, value)
{
  return promisify(callback =>
  {
    chrome.storage.local.set({[name]: value}, callback);
  });
}
exports.set = set;

function delete_(name)
{
  return promisify(callback =>
  {
    chrome.storage.local.remove(name, callback);
  });
}
exports.delete = delete_;

function deleteByPrefix(prefix)
{
  return promisify(callback =>
  {
    chrome.storage.local.get(null, callback);
  }).then(items =>
  {
    let keys = Object.keys(items).filter(name => name.substr(0, prefix.length) == prefix);
    return delete_(keys);
  });
}
exports.deleteByPrefix = deleteByPrefix;

// Old data migration
get("passwords").then(oldData =>
{
  if (!oldData)
    return;

  delete_("passwords");

  if (oldData.masterPasswordHash && oldData.masterPasswordSalt)
  {
    set("masterPassword", {
      hash: oldData.masterPasswordHash,
      salt: oldData.masterPasswordSalt
    });
  }

  if (oldData.sites)
  {
    for (let site in oldData.sites)
    {
      let siteData = oldData.sites[site];
      if (siteData.passwords)
      {
        for (let key in siteData.passwords)
        {
          if (siteData.passwords[key].type == "pbkdf2-sha1-generated")
            siteData.passwords[key].type = "generated";
          else if (siteData.passwords[key].type == "pbkdf2-sha1-aes256-encrypted")
            siteData.passwords[key].type = "stored";
        }
      }
      set("site:" + site, siteData);
    }
  }
});
