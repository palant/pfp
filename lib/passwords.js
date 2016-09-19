/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let storage = require("storage");

let {derivePassword, encryptPassword, decryptPassword} = require("./crypto");
let masterPassword = require("./masterPassword");

const STORAGE_PREFIX = "site:";

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

function _isEmpty(obj)
{
  return (!obj || Object.keys(obj).length == 0);
}

function _getSiteData(site)
{
  return storage.get(STORAGE_PREFIX + site).then(data =>
  {
    if (data)
      return data;
    else
      return {};
  });
}

function _setSiteData(site, siteData)
{
  return storage.set(STORAGE_PREFIX + site, siteData);
}

function _deleteSiteData(site)
{
  return storage.delete(STORAGE_PREFIX + site);
}

function getAlias(host)
{
  let origSite = _normalizeSite(host);
  return _getSiteData(origSite).then(siteData =>
  {
    return [origSite, siteData.alias || origSite];
  });
}
exports.getAlias = getAlias;

function addAlias(site, alias)
{
  return _getSiteData(site).then(siteData =>
  {
    if (!_isEmpty(siteData.passwords))
      throw "site-has-passwords";
  }).then(() =>
  {
    return _setSiteData(site, {alias});
  });
}
exports.addAlias = addAlias;

function removeAlias(site)
{
  return _getSiteData(site).then(siteData =>
  {
    if (!siteData || !siteData.alias)
      throw "no-such-alias";
  }).then(() =>
  {
    return _deleteSiteData(site);
  });
}
exports.removeAlias = removeAlias;

function transformPasswordData(key, data)
{
  let hasNotes = !!data.notes;

  if (data.type == "generated")
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
      symbol: data.symbol,
      hasNotes
    };
  }
  else if (data.type == "stored")
  {
    return {
      type: "stored",
      name: key,
      hasNotes
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
  return getAlias(host).then(([origSite, site]) =>
  {
    return Promise.all([origSite, site, _getSiteData(site)]);
  }).then(([origSite, site, siteData]) =>
  {
    return [origSite, site, transformPasswordList(siteData.passwords)];
  });
}
exports.getPasswords = getPasswords;

function getKey(name, revision)
{
  if (revision)
    return name + "\n" + revision;
  else
    return name;
}

function getPassword(site, name, revision)
{
  return _getSiteData(site).then(siteData =>
  {
    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

    let key = getKey(name, revision);
    if (!siteData.passwords || !siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    let passwordData = siteData.passwords[key];
    if (passwordData.type == "generated")
    {
      let {length, lower, upper, number, symbol} = passwordData;
      let params = {
        masterPassword: master,
        domain: site,
        name, revision, length, lower, upper, number, symbol
      };
      return derivePassword(params).then(([password, name]) => password);
    }
    else if (passwordData.type == "stored")
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
  return storage.getAllByPrefix(STORAGE_PREFIX).then(sites =>
  {
    let result = {};
    let aliases = [];
    let broken = [];
    for (let site in sites)
    {
      let siteData = sites[site];

      if (siteData.alias)
        aliases.push([site, siteData.alias]);
      else if (!_isEmpty(siteData.passwords))
        result[site] = {passwords: transformPasswordList(siteData.passwords), aliases: []};
      else
        broken.push(site);
    }

    for (let [site, alias] of aliases)
    {
      if (result.hasOwnProperty(alias))
        result[alias].aliases.push(site);
      else
        broken.push(site);
    }

    // Clean up empty entries and broken aliases
    for (let site of broken)
      _deleteSiteData(site);

    return result;
  });
}
exports.getAllPasswords = getAllPasswords;

function exportPasswordData()
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(sites =>
  {
    let result = {
      application: "easypasswords",
      format: 1,
      sites: {}
    };

    let aliases = [];
    for (let site in sites)
    {
      let siteData = sites[site];
      if (siteData.alias)
        aliases.push([site, siteData.alias]);
      else if (!_isEmpty(siteData.passwords))
      {
        result.sites[site] = {
          passwords: siteData.passwords,
          aliases: []
        };
      }
    }

    for (let [site, alias] of aliases)
      if (result.sites.hasOwnProperty(alias))
        result.sites[alias].aliases.push(site);

    return result;
  });
}
exports.exportPasswordData = exportPasswordData;

function checkImportedPassword(passwordData)
{
  if (!passwordData || typeof passwordData != "object")
    return null;

  if (passwordData.type == "generated" || passwordData.type == "pbkdf2-sha1-generated")
  {
    let length = parseInt(passwordData.length, 10);
    if (isNaN(length) || length < 4 || length > 24)
      return null;

    if (typeof passwordData.lower != "boolean" ||
        typeof passwordData.upper != "boolean" ||
        typeof passwordData.number != "boolean" ||
        typeof passwordData.symbol != "boolean")
    {
      return null;
    }

    return {
      type: "generated",
      length: length,
      lower: passwordData.lower,
      upper: passwordData.upper,
      number: passwordData.number,
      symbol: passwordData.symbol
    };
  }
  else if (passwordData.type == "stored" || passwordData.type == "pbkdf2-sha1-aes256-encrypted")
  {
    if (!passwordData.password || typeof passwordData.password != "string")
      return null;

    return {
      type: "stored",
      password: passwordData.password
    };
  }

  return null;
}

function importPasswordData(data)
{
  return storage.getAllByPrefix(STORAGE_PREFIX).then(sites =>
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

    if (!data || typeof data != "object" || data.application != "easypasswords" ||
        data.format != 1 || !data.sites || typeof data.sites != "object")
    {
      throw "unknown-data-format";
    }

    let mergeActions = [];
    for (let site in data.sites)
    {
      let importedData = data.sites[site];
      if (!importedData || typeof importedData != "object")
        continue;

      let siteData = sites[site] || {};
      if (siteData.alias)
        delete siteData.alias;
      if (!siteData.passwords)
        siteData.passwords = {};

      if (importedData.passwords && typeof importedData.passwords == "object")
      {
        for (let key in importedData.passwords)
        {
          let passwordData = checkImportedPassword(importedData.passwords[key]);
          if (passwordData)
            siteData.passwords[key] = passwordData;
        }
      }

      if (importedData.aliases && Symbol.iterator in importedData.aliases)
      {
        for (let alias of importedData.aliases)
        {
          if (!alias || typeof alias != "string")
            continue;

          let siteData = sites[alias];
          if (!siteData || _isEmpty(siteData.passwords))
            mergeActions.push(addAlias(alias, site));
        }
      }
      mergeActions.push(_setSiteData(site, siteData));
    }
    return Promise.all(mergeActions);
  });
}
exports.importPasswordData = importPasswordData;

function addGenerated({site, name, revision, length, lower, upper, number, symbol})
{
  return _getSiteData(site).then(siteData =>
  {
    if (!siteData.passwords)
      siteData.passwords = {};

    let key = getKey(name, revision);
    if (siteData.passwords.hasOwnProperty(key))
      throw "alreadyExists";

    siteData.passwords[key] = {
      type: "generated", length, lower, upper, number, symbol
    };

    return Promise.all([siteData, _setSiteData(site, siteData)]);
  }).then(([siteData, _]) => transformPasswordList(siteData.passwords));
}
exports.addGenerated = addGenerated;

function addLegacy({site, name, password})
{
  return _getSiteData(site).then(siteData =>
  {
    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

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
    return Promise.all([site, siteData, key, encryptPassword(params)]);
  }).then(([site, siteData, key, encrypted]) =>
  {
    siteData.passwords[key] = {
      type: "stored",
      password: encrypted
    };
    return Promise.all([siteData, _setSiteData(site, siteData)]);
  }).then(([siteData, _]) => transformPasswordList(siteData.passwords));
}
exports.addLegacy = addLegacy;

function removePassword(site, name, revision)
{
  return _getSiteData(site).then(siteData =>
  {
    if (!siteData.passwords)
      throw "no-such-password";

    let key = getKey(name, revision);
    if (!siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    delete siteData.passwords[key];
    return Promise.all([siteData, _setSiteData(site, siteData)]);
  }).then(([siteData, _]) => transformPasswordList(siteData.passwords));
}
exports.removePassword = removePassword;

function removeAll()
{
  return storage.deleteByPrefix(STORAGE_PREFIX);
}
exports.removeAll = removeAll;

function setNotes(site, name, revision, notes)
{
  return Promise.resolve().then(() =>
  {
    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

    let key = getKey(name, revision);
    let params = {
      masterPassword: master,
      domain: site,
      name: key + "\nnotes",
      password: notes
    };
    return Promise.all([_getSiteData(site), key, encryptPassword(params)]);
  }).then(([siteData, key, encrypted]) =>
  {
    if (!siteData.passwords)
      throw "no-such-password";
    if (!siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    siteData.passwords[key].notes = encrypted;
    return Promise.all([siteData, _setSiteData(site, siteData)]);
  }).then(([siteData, _]) => transformPasswordList(siteData.passwords));
}
exports.setNotes = setNotes;

function removeNotes(site, name, revision)
{
  return _getSiteData(site).then(siteData =>
  {
    if (!siteData.passwords)
      return [siteData];

    let key = getKey(name, revision);
    if (!siteData.passwords.hasOwnProperty(key))
      return [siteData];

    let passwordData = siteData.passwords[key];
    if (!passwordData.notes)
      return [siteData];

    delete passwordData.notes;
    return Promise.all([siteData, _setSiteData(site, siteData)]);
  }).then(([siteData, _]) => transformPasswordList(siteData.passwords));
}
exports.removeNotes = removeNotes;

function getNotes(site, name, revision)
{
  return _getSiteData(site).then(siteData =>
  {
    let key = getKey(name, revision);
    if (!siteData.passwords || !siteData.passwords.hasOwnProperty(key))
      throw "no-such-password";

    let passwordData = siteData.passwords[key];
    if (!passwordData.notes)
      return null;

    let master = masterPassword.get();
    if (!master)
      throw "master-password-required";

    let params = {
      masterPassword: master,
      domain: site,
      name: key + "\nnotes",
      encrypted: passwordData.notes
    };
    return decryptPassword(params);
  });
}
exports.getNotes = getNotes;
