"use strict";

let {storage} = require("sdk/simple-storage");

let {derivePassword, encryptPassword, decryptPassword} = require("./crypto");
let masterPassword = require("./masterPassword");

function _getSiteData(site)
{
  if (!storage.sites)
    storage.sites = {};

  if (!storage.sites[site])
    storage.sites[site] = {};

  return storage.sites[site];
}

function getAlias(host)
{
  if (host.substr(0, 4) == "www.")
    host = host.substr(4);

  let siteData = _getSiteData(host);
  return siteData.alias || host;
}
exports.getAlias = getAlias;

function getPasswords(host)
{
  let site = getAlias(host);
  let siteData = _getSiteData(site);
  return [site, siteData.passwords || {}];
}
exports.getPasswords = getPasswords;

function getPassword(site, name)
{
  return new Promise((resolve, reject) => {
    let siteData = _getSiteData(site);
    if (!siteData.passwords || !siteData.passwords.hasOwnProperty(name))
    {
      reject("no-such-password");
      return;
    }

    let passwordData = siteData.passwords[name];
    if (passwordData.type == "pbkdf2-sha1-generated")
    {
      let {length, lower, upper, number, symbol} = passwordData;
      let params = {
        masterPassword: masterPassword.get(),
        domain: site,
        name, length, lower, upper, number, symbol
      };
      derivePassword(params, ([password, name]) => resolve(password));
    }
    else if (passwordData.type == "pbkdf2-sha1-aes256-encrypted")
    {
      let encrypted = passwordData.password;
      let params = {
        masterPassword: masterPassword.get(),
        domain: site,
        name, encrypted
      };
      decryptPassword(params, resolve);
    }
    else
      reject("unknown-generation-method");
  });
}
exports.getPassword = getPassword;

function addGenerated({site, name, length, lower, upper, number, symbol})
{
  return new Promise((resolve, reject) => {
    let siteData = _getSiteData(site);
    if (!siteData.passwords)
      siteData.passwords = {};

    if (siteData.passwords.hasOwnProperty(name))
      reject("alreadyExists");
    else
    {
      siteData.passwords[name] = {
        type: "pbkdf2-sha1-generated", length, lower, upper, number, symbol
      };

      resolve(siteData.passwords);
    }
  });
}
exports.addGenerated = addGenerated;

function addLegacy({site, name, password})
{
  return new Promise((resolve, reject) => {
    let siteData = _getSiteData(site);
    if (!siteData.passwords)
      siteData.passwords = {};

    if (siteData.passwords.hasOwnProperty(name))
      reject("alreadyExists");
    else
    {
      let params = {
        masterPassword: masterPassword.get(),
        domain: site,
        name, password
      };
      encryptPassword(params, function(encrypted)
      {
        siteData.passwords[name] = {
          type: "pbkdf2-sha1-aes256-encrypted",
          password: encrypted
        };

        resolve(siteData.passwords);
      });
    }
  });
}
exports.addLegacy = addLegacy;

function removePassword({site, name})
{
  return new Promise((resolve, reject) => {
    let siteData = _getSiteData(site);
    if (!siteData.passwords)
      reject();

    if (!siteData.passwords.hasOwnProperty(name))
      reject();

    delete siteData.passwords[name];
    resolve(siteData.passwords);
  });
}
exports.removePassword = removePassword;
