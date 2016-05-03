/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {storage} = require("sdk/simple-storage");

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

function getPasswords(host)
{
  let [origSite, site] = getAlias(host);
  let siteData = _getSiteData(site);
  return [origSite, site, siteData.passwords || {}];
}
exports.getPasswords = getPasswords;

function hasPasswords(site)
{
  let siteData = _getSiteData(site);
  return Object.keys(siteData.passwords || {}) > 0;
}
exports.hasPasswords = hasPasswords;

function getPassword(site, name)
{
  return Promise.resolve().then(() =>
  {
    let master = masterPassword.get();
    if (!master)
      return Promise.reject("master-password-required");

    let siteData = _getSiteData(site);
    if (!siteData.passwords || !siteData.passwords.hasOwnProperty(name))
      return Promise.reject("no-such-password");

    let passwordData = siteData.passwords[name];
    if (passwordData.type == "pbkdf2-sha1-generated")
    {
      let {length, lower, upper, number, symbol} = passwordData;
      let params = {
        masterPassword: master,
        domain: site,
        name, length, lower, upper, number, symbol
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
      return Promise.reject("unknown-generation-method");
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
      result[site] = {passwords: siteData.passwords, aliases: []};

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

function addGenerated({site, name, length, lower, upper, number, symbol})
{
  return Promise.resolve().then(() =>
  {
    let siteData = _getSiteData(site, true);
    if (!siteData.passwords)
      siteData.passwords = {};

    if (siteData.passwords.hasOwnProperty(name))
      return Promise.reject("alreadyExists");

    siteData.passwords[name] = {
      type: "pbkdf2-sha1-generated", length, lower, upper, number, symbol
    };

    return siteData.passwords;
  });
}
exports.addGenerated = addGenerated;

function addLegacy({site, name, password})
{
  return Promise.resolve().then(() =>
  {
    let master = masterPassword.get();
    if (!master)
      return Promise.reject("master-password-required");

    let siteData = _getSiteData(site, true);
    if (!siteData.passwords)
      siteData.passwords = {};

    if (siteData.passwords.hasOwnProperty(name))
      return Promise.reject("alreadyExists");

    let params = {
      masterPassword: master,
      domain: site,
      name, password
    };
    return encryptPassword(params).then(encrypted =>
    {
      siteData.passwords[name] = {
        type: "pbkdf2-sha1-aes256-encrypted",
        password: encrypted
      };

      return siteData.passwords;
    });
  });
}
exports.addLegacy = addLegacy;

function addRawPassword(site, name, passwordData)
{
  if (!name || typeof name != "string")
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

    siteData.passwords[name] = {
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

    siteData.passwords[name] = {
      type: "pbkdf2-sha1-aes256-encrypted",
      password: passwordData.password
    };
  }
}
exports.addRawPassword = addRawPassword;

function removePassword({site, name})
{
  return Promise.resolve().then(() =>
  {
    let siteData = _getSiteData(site);
    if (!siteData.passwords)
      return Promise.reject("no-such-password");

    if (!siteData.passwords.hasOwnProperty(name))
      return Promise.reject("no-such-password");

    delete siteData.passwords[name];
    return siteData.passwords;
  });
}
exports.removePassword = removePassword;
