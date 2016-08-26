/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {storage} = require("storage");

let {derivePassword, encryptPassword, decryptPassword} = require("./crypto");
let masterPassword = require("./masterPassword");

function _getSiteData(site, autoAdd)
{
  if (!storage.sites)
    storage.sites = {};

  let result = storage.sites[site];
  if (!result)
  {
    result = {};
    if (autoAdd)
      storage.sites[site] = result;
  }

  return result;
}

function getAlias(host)
{
  let origSite = host;
  if (origSite.substr(0, 4) == "www.")
    origSite = origSite.substr(4);

  let siteData = _getSiteData(origSite);
  return [origSite, siteData.alias || origSite];
}
exports.getAlias = getAlias;

function addAlias(site, alias)
{
  let siteData = _getSiteData(site, true);
  siteData.alias = alias;
}
exports.addAlias = addAlias;

function removeAlias(site)
{
  let siteData = _getSiteData(site);
  delete siteData.alias;
}
exports.removeAlias = removeAlias;

function transformPasswordData(key, data)
{
  if (data.type == "pbkdf2-sha1-generated")
  {
    let name = key;
    let revision = "";
    let index = key.indexOf("\n");
    if (index >= 0)
    {
      name = key.substr(0, index);
      revision = key.substr(index + 1);
    }

    return {
      type: "generated",
      name, revision,
      length: data.length,
      lower: data.lower,
      upper: data.upper,
      number: data.number,
      symbol: data.symbol
    };
  }
  else if (data.type == "pbkdf2-sha1-aes256-encrypted")
  {
    return {
      type: "stored",
      name: key
    };
  }
  else
    return null;
}

function transformPasswordList(pwdList)
{
  let result = [];
  if (pwdList)
  {
    for (let key in pwdList)
    {
      if (pwdList.hasOwnProperty(key))
      {
        let transformed = transformPasswordData(key, pwdList[key]);
        if (transformed)
          result.push(transformed);
      }
    }
  }

  result.sort((a, b) =>
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

  return result;
}

function getPasswords(host)
{
  let [origSite, site] = getAlias(host);
  let siteData = _getSiteData(site);
  return [origSite, site, transformPasswordList(siteData.passwords)];
}
exports.getPasswords = getPasswords;

function getKey(name, revision)
{
  if (revision)
    return name + "\n" + revision;
  else
    return name;
}

function hasPasswords(site)
{
  let siteData = _getSiteData(site);
  return Object.keys(siteData.passwords || {}) > 0;
}

function getPassword(site, name, revision)
{
  return Promise.resolve().then(() =>
  {
    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

    let key = getKey(name, revision);
    let siteData = _getSiteData(site);
    if (!siteData.passwords || !siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    let passwordData = siteData.passwords[key];
    if (passwordData.type == "pbkdf2-sha1-generated")
    {
      let {length, lower, upper, number, symbol} = passwordData;
      let params = {
        masterPassword: master,
        domain: site,
        name, revision, length, lower, upper, number, symbol
      };
      return derivePassword(params).then(([password, name]) => password);
    }
    else if (passwordData.type == "pbkdf2-sha1-aes256-encrypted")
    {
      let encrypted = passwordData.password;
      let params = {
        masterPassword: master,
        domain: site,
        name, encrypted
      };
      return decryptPassword(params);
    }
    else
      throw "unknown-generation-method";
  });
}
exports.getPassword = getPassword;

function getAllPasswords()
{
  let sites = storage.sites || {};
  let result = {};
  let broken = [];
  for (let site in sites)
  {
    let siteData = sites[site];

    // Clean up entries where all passwords have been removed
    if ("passwords" in siteData && Object.keys(siteData.passwords).length == 0)
      delete siteData.passwords;
    else if (!siteData.alias)
      result[site] = {passwords: transformPasswordList(siteData.passwords), aliases: []};

    if (Object.keys(siteData).length == 0)
      broken.push(site);
  }

  for (let site in sites)
  {
    let siteData = sites[site];

    if (siteData.alias)
    {
      if (siteData.alias in result)
        result[siteData.alias].aliases.push(site);
      else
        broken.push(site);
    }
  }

  // Clean up empty entries and broken aliases
  for (let site of broken)
    delete sites[site];

  return result;
}
exports.getAllPasswords = getAllPasswords;

function exportPasswordData()
{
  let sites = storage.sites || {};
  let result = {
    application: "easypasswords",
    format: 1,
    sites: {}
  };
  for (let site in sites)
  {
    let siteData = sites[site];
    if (!siteData.alias && "passwords" in siteData && Object.keys(siteData.passwords).length)
      result.sites[site] = {passwords: JSON.parse(JSON.stringify(siteData.passwords)), aliases: []};
  }

  for (let site in sites)
  {
    let siteData = sites[site];
    if (siteData.alias)
      if (siteData.alias in result.sites)
        result.sites[siteData.alias].aliases.push(site);
  }

  return result;
}
exports.exportPasswordData = exportPasswordData;

function importPasswordData(data)
{
  try
  {
    data = JSON.parse(data);
  }
  catch (e)
  {
    data = null;
    console.error(e);
  }

  if (!data || typeof data != "object" || data.application != "easypasswords" || data.format != 1)
    throw "unknown-data-format";

  let sites = data.sites;
  for (let site in sites)
  {
    let siteInfo = sites[site];
    if (!siteInfo || typeof siteInfo != "object")
      continue;

    removeAlias(site);
    if (siteInfo.passwords && typeof siteInfo.passwords == "object")
      for (let key in siteInfo.passwords)
        addRawPassword(site, key, siteInfo.passwords[key]);

    if (siteInfo.aliases && Symbol.iterator in siteInfo.aliases)
    {
      for (let alias of siteInfo.aliases)
      {
        if (!alias || typeof alias != "string")
          continue;

        if (!hasPasswords(alias))
          addAlias(alias, site);
      }
    }
  }
}
exports.importPasswordData = importPasswordData;

function addGenerated({site, name, revision, length, lower, upper, number, symbol})
{
  return Promise.resolve().then(() =>
  {
    let siteData = _getSiteData(site, true);
    if (!siteData.passwords)
      siteData.passwords = {};

    let key = getKey(name, revision);
    if (siteData.passwords.hasOwnProperty(key))
      throw "alreadyExists";

    siteData.passwords[key] = {
      type: "pbkdf2-sha1-generated", length, lower, upper, number, symbol
    };

    return transformPasswordList(siteData.passwords);
  });
}
exports.addGenerated = addGenerated;

function addLegacy({site, name, password})
{
  return Promise.resolve().then(() =>
  {
    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

    let siteData = _getSiteData(site, true);
    if (!siteData.passwords)
      siteData.passwords = {};

    let key = name;
    if (siteData.passwords.hasOwnProperty(key))
      throw "alreadyExists";

    let params = {
      masterPassword: master,
      domain: site,
      name, password
    };
    return encryptPassword(params).then(encrypted =>
    {
      siteData.passwords[key] = {
        type: "pbkdf2-sha1-aes256-encrypted",
        password: encrypted
      };

      return transformPasswordList(siteData.passwords);
    });
  });
}
exports.addLegacy = addLegacy;

function addRawPassword(site, key, passwordData)
{
  if (!key || typeof key != "string")
    return;
  if (!passwordData || typeof passwordData != "object")
    return;

  let siteData = _getSiteData(site, true);
  if (!siteData.passwords)
    siteData.passwords = {};

  if (passwordData.type == "pbkdf2-sha1-generated")
  {
    let length = parseInt(passwordData.length, 10);
    if (isNaN(length) || length < 4 || length > 24)
      return;

    if (typeof passwordData.lower != "boolean" ||
        typeof passwordData.upper != "boolean" ||
        typeof passwordData.number != "boolean" ||
        typeof passwordData.symbol != "boolean")
    {
      return;
    }

    siteData.passwords[key] = {
      type: "pbkdf2-sha1-generated",
      length: length,
      lower: passwordData.lower,
      upper: passwordData.upper,
      number: passwordData.number,
      symbol: passwordData.symbol
    };
  }
  else if (passwordData.type == "pbkdf2-sha1-aes256-encrypted")
  {
    if (!passwordData.password || typeof passwordData.password != "string")
      return;

    siteData.passwords[key] = {
      type: "pbkdf2-sha1-aes256-encrypted",
      password: passwordData.password
    };
  }
}

function removePassword(site, name, revision)
{
  return Promise.resolve().then(() =>
  {
    let siteData = _getSiteData(site);
    if (!siteData.passwords)
      throw "no-such-password";

    let key = getKey(name, revision);
    if (!siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    delete siteData.passwords[key];
    return transformPasswordList(siteData.passwords);
  });
}
exports.removePassword = removePassword;
