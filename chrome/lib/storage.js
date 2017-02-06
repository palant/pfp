/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let browser = require("./browserAPI");
let prefs = require("./prefs");

let MEM = {};  // temporary site storage
const SITE_PREFIX = "site:";

function get(name)
{
  return prefs.get("site_storage").then(site_storage =>
  {
    if (!site_storage && name.startsWith(SITE_PREFIX))
      return Promise.resolve().then(() => MEM[name] ? MEM[name] : null);
    else
      return browser.storage.local.get(name).then(items => items[name]);
  });
}
exports.get = get;

function _noStorageGetAllByPrefix(prefix)
{
  return Promise.resolve().then(() =>
  {
    let result = {};
    for (let name in MEM)
      if (name.substr(0, prefix.length) == prefix)
        result[name.substr(prefix.length)] = MEM[name];
    return result;
  });
}

function getAllByPrefix(prefix)
{
  return prefs.get("site_storage").then(site_storage =>
  {
    if (!site_storage && prefix.startsWith(SITE_PREFIX))
      return _noStorageGetAllByPrefix();
    else
      return browser.storage.local.get(null).then(items =>
      {
        let result = {};
        for (let name in items)
          if (name.substr(0, prefix.length) == prefix)
            result[name.substr(prefix.length)] = items[name];
        return result;
      });
  });
}
exports.getAllByPrefix = getAllByPrefix;

function set(name, value)
{
  return prefs.get("site_storage").then(site_storage =>
  {
    if (!site_storage && name.startsWith(SITE_PREFIX))
      return Promise.resolve().then(() => MEM[name] = value);
    else
      return browser.storage.local.set({[name]: value});
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
