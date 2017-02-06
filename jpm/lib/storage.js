/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let prefs = require("prefs");
let sp = require("sdk/simple-prefs");
let {indexedDB, IDBKeyRange} = require("sdk/indexed-db");

const DB_NAME = "storage";
const DB_VERSION = 1;
const STORE_NAME = "data";

function prefixToRange(prefix)
{
  let upper = prefix.substr(0, prefix.length - 1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
  return IDBKeyRange.bound(prefix, upper, false, true);
}

function promisify(request)
{
  return new Promise((resolve, reject) =>
  {
    let onComplete = () =>
    {
      if (request.error)
        reject(request.error);
      else
        resolve(request.result);
    };

    if (request.readyState == "done")
      onComplete();
    else
      request.onsuccess = request.onerror = onComplete;
  });
}

let connection = Promise.resolve().then(() =>
{
  let request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = event =>
  {
    let db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME))
    {
      db.createObjectStore(STORE_NAME, {keyPath: "name"});
      migrateOldData();
    }
  };

  return promisify(request);
});

function get(name)
{
  return connection.then(db =>
  {
    let store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
    return promisify(store.get(name)).then(result => result ? result.value : null);
  });
}
exports.get = get;

function getAllByPrefix(prefix)
{
  return connection.then(db =>
  {
    return new Promise((resolve, reject) =>
    {
      let store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
      let request = store.openCursor(prefixToRange(prefix));
      let result = {};
      request.onsuccess = event =>
      {
        let cursor = request.result;
        if (cursor)
        {
          let {name, value} = cursor.value;
          result[name.substr(prefix.length)] = value;
          cursor.continue();
        }
        else
          resolve(result);
      };
      request.onerror = event =>
      {
        reject(request.error);
      };
    });
  });
}
exports.getAllByPrefix = getAllByPrefix;

function set(name, value)
{
  return prefs.get("site_storage").then(site_storage =>
  {
    if (!site_storage && name.startsWith("site:"))
    {
      return Promise.reject("storageDisabled");
    }
    return connection.then(db =>
    {
      let store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
      return promisify(store.put({name, value}));
    });
  });
}
exports.set = set;

function delete_(name)
{
  return connection.then(db =>
  {
    let store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    return promisify(store.delete(name));
  });
}
exports.delete = delete_;

function deleteByPrefix(prefix)
{
  return delete_(prefixToRange(prefix));
}
exports.deleteByPrefix = deleteByPrefix;

function migrateOldData()
{
  let {storage: oldData} = require("sdk/simple-storage");

  if (oldData.masterPasswordHash && oldData.masterPasswordSalt)
  {
    set("masterPassword", {
      hash: oldData.masterPasswordHash,
      salt: oldData.masterPasswordSalt
    });

    delete oldData.masterPasswordHash;
    delete oldData.masterPasswordSalt;
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

    delete oldData.sites;
  }
}
