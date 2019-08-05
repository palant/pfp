/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import storage from "./storage";
import {derivePassword} from "./crypto";
import {
  nameToStorageKey, getMasterPassword, saltKey, hmacSecretKey
} from "./masterPassword";
import {migrateData as doMigrate} from "./migration";
import Lock from "./lock";
import * as defaultImporter from "./importers/default";
import * as lastPassImporter from "./importers/lastPass";

export const lock = new Lock();

export const STORAGE_PREFIX = "site:";

function _normalizeSite(site)
{
  // Remove trailing dots
  if (site && site[site.length - 1] == ".")
    site = site.substr(0, site.length - 1);

  // Remove www. prefix
  if (site.substr(0, 4) == "www.")
    site = site.substr(4);

  return site;
}

function _sortPasswords(list)
{
  list.sort((a, b) =>
  {
    if (a.name < b.name)
      return -1;
    else if (a.name > b.name)
      return 1;
    else
    {
      let rev1 = a.revision ? parseInt(a.revision, 10) : 1;
      let rev2 = b.revision ? parseInt(b.revision, 10) : 1;
      if (!isNaN(rev1) && !isNaN(rev2))
        return rev1 - rev2;
      else if (a.revision < b.revision)
        return -1;
      else if (a.revision > b.revision)
        return 1;
      else
        return 0;
    }
  });

  return list;
}

function _getSiteKey(site)
{
  return nameToStorageKey(site).then(digest =>
  {
    return `${STORAGE_PREFIX}${digest}`;
  });
}

function _getPasswordPrefix(site)
{
  return _getSiteKey(site).then(key => `${key}:`);
}

function _getPasswordKey(site, name, revision)
{
  return Promise.all([
    nameToStorageKey(site),
    nameToStorageKey(site + "\0" + name + "\0" + (revision || ""))
  ]).then(([digest1, digest2]) =>
  {
    return `${STORAGE_PREFIX}${digest1}:${digest2}`;
  });
}

function _getSiteData(site)
{
  return _getSiteKey(site).then(key =>
  {
    return storage.get(key).then(data =>
    {
      if (data)
        return data;
      else
        return {};
    });
  });
}

function _hasPasswords(site)
{
  return _getPasswordPrefix(site).then(prefix =>
  {
    return storage.hasPrefix(prefix);
  });
}

function _getPasswords(site)
{
  return _getPasswordPrefix(site).then(prefix =>
  {
    return storage.getAllByPrefix(prefix);
  }).then(data =>
  {
    return _sortPasswords(Object.keys(data).map(key => data[key]));
  });
}

function _ensureSiteData(site)
{
  return _getSiteKey(site).then(key =>
  {
    return storage.has(key).then(exists =>
    {
      if (!exists)
        return storage.set(key, {site});
      return null;
    });
  });
}

function _deleteSiteData(site)
{
  return _getSiteKey(site).then(key => storage.delete(key));
}

function _deletePassword(site, name, revision)
{
  return _getPasswordKey(site, name, revision).then(key => storage.delete(key));
}

export function getAlias(host)
{
  let origSite = _normalizeSite(host);
  return _getSiteData(origSite).then(siteData =>
  {
    return [origSite, siteData.alias || origSite];
  });
}

export function addAlias(site, alias)
{
  return lock.acquire().then(() =>
  {
    return _hasPasswords(site);
  }).then(hasPasswords =>
  {
    if (hasPasswords)
      throw "site_has_passwords";

    return setSite({site, alias});
  }).finally(() => lock.release());
}

export function removeAlias(site)
{
  return lock.acquire().then(() => _getSiteData(site)).then(siteData =>
  {
    if (!siteData || !siteData.alias)
      throw "no_such_alias";
  }).then(() =>
  {
    return _deleteSiteData(site);
  }).finally(() => lock.release());
}

export function getPasswords(host)
{
  return getAlias(host).then(([origSite, site]) =>
  {
    return Promise.all([origSite, site, _getPasswords(site)]);
  });
}

export function getPassword(passwordData)
{
  return _getPasswordKey(passwordData.site, passwordData.name, passwordData.revision).then(key =>
  {
    return storage.get(key);
  }).then(passwordData =>
  {
    if (!passwordData)
      throw "no_such_password";

    if (passwordData.type == "stored")
      return passwordData.password;

    if (passwordData.type == "generated2")
    {
      let {site, name, revision, length, lower, upper, number, symbol} = passwordData;
      let params = {
        masterPassword: getMasterPassword(),
        domain: site,
        name, revision, length, lower, upper, number, symbol
      };
      return derivePassword(params);
    }

    throw "unknown_generation_method";
  });
}

export function getAllPasswords()
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(data =>
  {
    let entries = Object.keys(data).map(key => data[key]);
    let result = Object.create(null);
    for (let siteData of entries)
    {
      if (siteData.type || siteData.alias)
        continue;

      result[siteData.site] = siteData;
      siteData.passwords = [];
      siteData.aliases = [];
    }

    for (let passwordData of entries)
    {
      if (!passwordData.type)
        continue;

      let siteData = result[passwordData.site];
      if (siteData)
        siteData.passwords.push(passwordData);
      else
        _deletePassword(passwordData.site, passwordData.name, passwordData.revision);
    }

    for (let siteData of entries)
    {
      if (siteData.type || !siteData.alias)
        continue;

      let targetSiteData = result[siteData.alias];
      if (targetSiteData && targetSiteData.passwords.length)
        targetSiteData.aliases.push(siteData.site);
      else
        _deleteSiteData(siteData.site);
    }

    for (let site of Object.keys(result))
    {
      let siteData = result[site];
      if (siteData.passwords.length)
      {
        _sortPasswords(siteData.passwords);
        siteData.aliases.sort();
      }
      else
      {
        delete result[site];
        _deleteSiteData(site);
      }
    }

    return result;
  });
}

export function getAllSites()
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(data =>
  {
    let sites = [];
    for (let key of Object.keys(data))
    {
      let siteData = data[key];
      if (siteData.type || siteData.alias)
        continue;

      sites.push(siteData.site);
    }
    sites.sort();
    return sites;
  });
}

export function exportPasswordData(extraKeys = [])
{
  let exportedKeys = [saltKey, hmacSecretKey].concat(extraKeys);
  return storage.getAllByPrefix("", null).then(data =>
  {
    for (let key of Object.keys(data))
      if (!key.startsWith(STORAGE_PREFIX) && !exportedKeys.includes(key))
        delete data[key];

    return JSON.stringify({
      application: "pfp",
      format: 3,
      data
    });
  });
}

export function importPasswordData(data, masterPass)
{
  let importers = [
    defaultImporter,
    lastPassImporter
  ];

  function setRaw(key, value)
  {
    return storage.set(key, value, null);
  }

  function tryNext()
  {
    let importer = importers.shift();
    return importer.import(data, setRaw, setSite, setPassword, masterPass).catch(e =>
    {
      if (e != "unknown_data_format" || !importers.length)
        throw e;
      return tryNext();
    });
  }

  return lock.acquire().then(tryNext).finally(() => lock.release());
}

export function setPassword(entry)
{
  return _getPasswordKey(entry.site, entry.name, entry.revision).then(key =>
  {
    return storage.set(key, entry);
  });
}

export function setSite(entry)
{
  return _getSiteKey(entry.site).then(key =>
  {
    return storage.set(key, entry);
  });
}

export function addGenerated({site, name, revision, length, lower, upper, number, symbol, notes}, replaceExisting)
{
  return lock.acquire().then(() => _ensureSiteData(site)).then(() =>
  {
    return _getPasswordKey(site, name, revision);
  }).then(key =>
  {
    if (replaceExisting)
      return [key, false];

    return Promise.all([key, storage.has(key)]);
  }).then(([key, exists]) =>
  {
    if (exists)
      throw "alreadyExists";

    let type = "generated2";
    let data = {
      site, name, revision, type, length, lower, upper, number, symbol
    };
    if (notes)
      data.notes = notes;
    return storage.set(key, data);
  }).then(_ => _getPasswords(site)).finally(() => lock.release());
}

export function addStored({site, name, revision, password, notes})
{
  return lock.acquire().then(() => _ensureSiteData(site)).then(() =>
  {
    return _getPasswordKey(site, name, revision);
  }).then(key =>
  {
    return Promise.all([key, storage.has(key)]);
  }).then(([key, exists]) =>
  {
    if (exists)
      throw "alreadyExists";

    let data = {
      type: "stored",
      site, name, revision, password
    };
    if (notes)
      data.notes = notes;
    return storage.set(key, data);
  }).then(_ => _getPasswords(site)).finally(() => lock.release());
}

export function removePassword(passwordData)
{
  return lock.acquire().then(() =>
  {
    return _getPasswordKey(passwordData.site, passwordData.name, passwordData.revision);
  }).then(key =>
  {
    return storage.has(key).then(exists =>
    {
      if (!exists)
        throw "no_such_password";

      return storage.delete(key);
    });
  }).then(_ => _getPasswords(passwordData.site)).finally(() => lock.release());
}

export function setNotes(passwordData, notes)
{
  return lock.acquire().then(() =>
  {
    return _getPasswordKey(passwordData.site, passwordData.name, passwordData.revision);
  }).then(key =>
  {
    return Promise.all([key, storage.get(key)]);
  }).then(([key, data]) =>
  {
    if (!data)
      throw "no_such_password";

    if (notes)
      data.notes = notes;
    else
      delete data.notes;
    return storage.set(key, data);
  }).then(_ => _getPasswords(passwordData.site)).finally(() => lock.release());
}

export function getNotes(passwordData)
{
  return _getPasswordKey(passwordData.site, passwordData.name, passwordData.revision).then(key =>
  {
    return storage.get(key);
  }).then(passwordData =>
  {
    if (!passwordData)
      throw "no_such_password";
    return passwordData.notes;
  });
}

let migrationInProgress = null;

export function migrateData(masterPassword)
{
  if (!migrationInProgress)
  {
    migrationInProgress = lock.acquire().then(() =>
    {
      return doMigrate(masterPassword, STORAGE_PREFIX, setPassword);
    }).finally(() =>
    {
      migrationInProgress = null;
      lock.release();
    });
  }
  return migrationInProgress;
}

export function isMigrating()
{
  return !!migrationInProgress;
}
