/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import storage, {nameToStorageKey, saltKey, hmacSecretKey} from "./storage.js";
import {derivePassword} from "./crypto.js";
import {locked} from "./lock.js";

let masterPasswordCallback = null;
export function setMasterPasswordCallback(callback)
{
  masterPasswordCallback = callback;
}

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

async function _getSiteKey(site)
{
  let digest = await nameToStorageKey(site);
  return `${STORAGE_PREFIX}${digest}`;
}

async function _getPasswordPrefix(site)
{
  let key = await _getSiteKey(site);
  return `${key}:`;
}

async function _getPasswordKey(site, name, revision)
{
  let prefix = await _getPasswordPrefix(site);
  let digest = await nameToStorageKey(site + "\0" + name + "\0" + (revision || ""));
  return prefix + digest;
}

async function _getSiteData(site)
{
  let key = await _getSiteKey(site);
  let data = await storage.get(key);
  if (data)
    return data;
  else
    return {};
}

async function _hasPasswords(site)
{
  let prefix = await _getPasswordPrefix(site);
  return await storage.hasPrefix(prefix);
}

async function _getPasswords(site)
{
  let prefix = await _getPasswordPrefix(site);
  let data = await storage.getAllByPrefix(prefix);
  return _sortPasswords(Object.values(data));
}

async function _ensureSiteData(site)
{
  let key = await _getSiteKey(site);
  if (!(await storage.has(key)))
    await storage.set(key, {site});
}

async function _deleteSiteData(site)
{
  let key = await _getSiteKey(site);
  await storage.delete(key);
}

async function _deletePassword(site, name, revision)
{
  let key = await _getPasswordKey(site, name, revision);
  await storage.delete(key);
}

export async function getAlias(host)
{
  let origSite = _normalizeSite(host);
  let siteData = await _getSiteData(origSite);
  return [origSite, siteData.alias || origSite];
}

export const addAlias = locked(async function(site, alias)
{
  if (await _hasPasswords(site))
    throw "site_has_passwords";

  await setSite({site, alias});
});

export const removeAlias = locked(async function(site)
{
  let siteData = await _getSiteData(site);
  if (!siteData || !siteData.alias)
    throw "no_such_alias";
  await _deleteSiteData(site);
});

export async function getPasswords(host)
{
  let [origSite, site] = await getAlias(host);
  let passwords = await _getPasswords(site);
  return [origSite, site, passwords];
}

export async function getPassword(passwordData)
{
  let key = await _getPasswordKey(passwordData.site, passwordData.name, passwordData.revision);
  passwordData = await storage.get(key);
  if (!passwordData)
    throw "no_such_password";

  if (passwordData.type == "stored")
    return passwordData.password;

  if (passwordData.type == "generated2")
  {
    let {site, name, revision, length, lower, upper, number, symbol} = passwordData;
    let params = {
      masterPassword: await masterPasswordCallback(),
      domain: site,
      name, revision, length, lower, upper, number, symbol
    };
    return await derivePassword(params);
  }

  throw "unknown_generation_method";
}

export async function getAllPasswords()
{
  let data = await storage.getAllByPrefix(STORAGE_PREFIX);
  let entries = Object.values(data);
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
      await _deletePassword(passwordData.site, passwordData.name, passwordData.revision);
  }

  for (let siteData of entries)
  {
    if (siteData.type || !siteData.alias)
      continue;

    let targetSiteData = result[siteData.alias];
    if (targetSiteData && targetSiteData.passwords.length)
      targetSiteData.aliases.push(siteData.site);
    else
      await _deleteSiteData(siteData.site);
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
      await _deleteSiteData(site);
    }
  }

  return result;
}

export async function getAllSites()
{
  let data = await storage.getAllByPrefix(STORAGE_PREFIX);
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
}

export async function exportPasswordData(extraKeys = [])
{
  let exportedKeys = [saltKey, hmacSecretKey].concat(extraKeys);
  let data = await storage.getAllByPrefix("", null);
  for (let key of Object.keys(data))
    if (!key.startsWith(STORAGE_PREFIX) && !exportedKeys.includes(key))
      delete data[key];

  return JSON.stringify({
    application: "pfp",
    format: 3,
    data
  });
}

let importers = [];

export function registerImporter(importer)
{
  importers.push(importer);
}

export const importPasswordData = locked(async function(data, masterPass)
{
  async function setRaw(key, value)
  {
    await storage.set(key, value, null);
  }

  for (let importer of importers)
  {
    try
    {
      await importer(data, setRaw, setSite, setPassword, masterPass);
      break;
    }
    catch (e)
    {
      if (e != "unknown_data_format" || importer == importers[importers.length - 1])
        throw e;
    }
  }
});

export async function setPassword(entry)
{
  let key = await _getPasswordKey(entry.site, entry.name, entry.revision);
  await storage.set(key, entry);
}

export async function setSite(entry)
{
  let key = await _getSiteKey(entry.site);
  await storage.set(key, entry);
}

export const addGenerated = locked(async function({site, name, revision, length, lower, upper, number, symbol, notes}, replaceExisting)
{
  await _ensureSiteData(site);

  let key = await _getPasswordKey(site, name, revision);
  if (!replaceExisting && await storage.has(key))
    throw "alreadyExists";

  let type = "generated2";
  let data = {
    site, name, revision, type, length, lower, upper, number, symbol
  };
  if (notes)
    data.notes = notes;
  await storage.set(key, data);
  return await _getPasswords(site);
});

export const addStored = locked(async function({site, name, revision, password, notes})
{
  await _ensureSiteData(site);

  let key = await _getPasswordKey(site, name, revision);
  if (await storage.has(key))
    throw "alreadyExists";

  let data = {
    type: "stored",
    site, name, revision, password
  };
  if (notes)
    data.notes = notes;
  await storage.set(key, data);
  return await _getPasswords(site);
});

export const removePassword = locked(async function({site, name, revision})
{
  let key = await _getPasswordKey(site, name, revision);
  if (!await storage.has(key))
    throw "no_such_password";

  await storage.delete(key);
  return await _getPasswords(site);
});

export const setNotes = locked(async function({site, name, revision}, notes)
{
  let key = await _getPasswordKey(site, name, revision);
  let data = await storage.get(key);
  if (!data)
    throw "no_such_password";

  if (notes)
    data.notes = notes;
  else
    delete data.notes;
  await storage.set(key, data);
  return await _getPasswords(site);
});

export async function getNotes({site, name, revision})
{
  let key = await _getPasswordKey(site, name, revision);
  let data = await storage.get(key);
  if (!data)
    throw "no_such_password";
  return data.notes;
}
