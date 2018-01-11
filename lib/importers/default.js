/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let crypto = require("../crypto");
let storage = require("../storage");
let masterPassword = require("../masterPassword");
let passwords = require("../passwords");

function importUnchanged(data, setRaw)
{
  let mergeActions = [];
  for (let key in data)
  {
    if (key.startsWith(passwords.STORAGE_PREFIX))
      mergeActions.push(setRaw(key, data[key]));
  }
  return Promise.all(mergeActions);
}

function decryptThenImport(data, setSite, setPassword)
{
  return crypto.deriveKey({
    masterPassword: masterPassword.get(),
    salt: data[masterPassword.saltKey]
  }).then(decryptionKey =>
  {
    return Promise.all([
      decryptionKey,
      masterPassword.decrypt(data[masterPassword.hmacSecretKey], decryptionKey)
    ]);
  }).catch(error =>
  {
    console.error(error);
    throw "wrong-master-password";
  }).then(([decryptionKey, hmacSecret]) =>
  {
    let decryptActions = [];
    for (let key in data)
      if (key.startsWith(passwords.STORAGE_PREFIX))
        decryptActions.push(masterPassword.decrypt(data[key], decryptionKey));
    return Promise.all(decryptActions);
  }).then(entries =>
  {
    let mergeActions = [];
    for (let entry of entries)
    {
      if (!entry.type)
        mergeActions.push(setSite(entry));
      else if (entry.type == "generated2" || entry.type == "generated" || entry.type == "stored")
        mergeActions.push(setPassword(entry));
    }
    return Promise.all(mergeActions);
  });
}

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
        data.application != "easypasswords" || data.format != 2 ||
        !data.data || typeof data.data != "object" ||
        typeof data.data[masterPassword.saltKey] != "string" ||
        typeof data.data[masterPassword.hmacSecretKey] != "string")
    {
      throw "unknown-data-format";
    }

    return Promise.all([
      storage.get(masterPassword.saltKey, null),
      storage.get(masterPassword.hmacSecretKey, null)
    ]);
  }).then(([saltRaw, hmacSecretRaw]) =>
  {
    if (saltRaw == data.data[masterPassword.saltKey] && hmacSecretRaw == data.data[masterPassword.hmacSecretKey])
    {
      // Backup was created with the same crypto parameters, we can just import
      // the entries as they are, without decrypting them first.
      return importUnchanged(data.data, setRaw);
    }
    else
      return decryptThenImport(data.data, setSite, setPassword);
  });
}
exports.import = import_;
