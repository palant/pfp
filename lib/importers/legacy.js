/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let crypto = require("../crypto");
let masterPassword = require("../masterPassword");

function getNotesName(name, revision)
{
  return name + "\0" + (revision || "") + "\0notes";
}

function importPassword(site, name, revision, data, setPassword)
{
  if (!data || typeof data != "object")
    return null;

  if (data.type == "generated" || data.type == "pbkdf2-sha1-generated")
  {
    let length = parseInt(data.length, 10);
    if (isNaN(length) || length < 4 || length > 24)
      return null;

    if (typeof data.lower != "boolean" ||
        typeof data.upper != "boolean" ||
        typeof data.number != "boolean" ||
        typeof data.symbol != "boolean")
    {
      return null;
    }

    let result = {
      type: "generated",
      site, name, revision,
      length,
      lower: data.lower,
      upper: data.upper,
      number: data.number,
      symbol: data.symbol
    };

    if (typeof data.notes == "string")
    {
      return crypto.decryptPasswordLegacy({
        masterPassword: masterPassword.get(),
        domain: site,
        name: getNotesName(name, revision),
        encrypted: data.notes
      }).then(notes =>
      {
        result.notes = notes;
        return setPassword(result);
      });
    }
    else
      return setPassword(result);
  }
  else if (data.type == "stored" || data.type == "pbkdf2-sha1-aes256-encrypted")
  {
    if (!data.password || typeof data.password != "string")
      return null;

    return crypto.decryptPasswordLegacy({
      masterPassword: masterPassword.get(),
      domain: site,
      name,
      encrypted: data.password
    }).then(password =>
    {
      let result = {
        type: "stored",
        site, name, revision, password
      };

      if (typeof data.notes == "string")
      {
        return crypto.decryptPasswordLegacy({
          masterPassword: masterPassword.get(),
          domain: site,
          name: getNotesName(name, revision),
          encrypted: data.notes
        }).then(notes =>
        {
          result.notes = notes;
          return setPassword(result);
        });
      }
      else
        return setPassword(result);
    });
  }

  return null;
}
exports.importPassword = importPassword;

function import_(data, setRaw, setSite, setPassword)
{
  return Promise.resolve().then(() =>
  {
    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      throw "unknown-data-format";
    }

    if (!data || typeof data != "object" ||
        data.application != "easypasswords" || data.format != 1 ||
        !data.sites || typeof data.sites != "object")
    {
      throw "unknown-data-format";
    }

    let mergeActions = [];
    for (let site in data.sites)
    {
      let importedData = data.sites[site];
      if (!importedData || typeof importedData != "object")
        continue;

      mergeActions.push(setSite({site}));

      if (importedData.passwords && typeof importedData.passwords == "object")
      {
        for (let key in importedData.passwords)
        {
          let name = key;
          let revision = "";
          let index = key.indexOf("\n");
          if (index >= 0)
          {
            name = key.substr(0, index);
            revision = key.substr(index + 1);
          }

          mergeActions.push(
            importPassword(site, name, revision, importedData.passwords[key], setPassword)
          );
        }
      }

      if (importedData.aliases && Symbol.iterator in importedData.aliases)
      {
        for (let alias of importedData.aliases)
        {
          if (!alias || typeof alias != "string")
            continue;

          mergeActions.push(setSite({site: alias, alias: site}));
        }
      }
    }
    return Promise.all(mergeActions);
  });
}
exports.import = import_;
