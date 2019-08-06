/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import storage from "../storage";
import {
  saltKey, hmacSecretKey, deriveKeyWithPassword, getMasterPassword
} from "../masterPassword";
import {STORAGE_PREFIX, registerImporter} from "../passwords";
import {decrypt} from "../storage";
import {derivePassword, derivePasswordLegacy} from "../crypto";

function importUnchanged(data, setRaw)
{
  let mergeActions = [];
  for (let key in data)
  {
    if (key.startsWith(STORAGE_PREFIX))
      mergeActions.push(setRaw(key, data[key]));
  }
  return Promise.all(mergeActions);
}

function decryptThenImport(data, masterPass, setSite, setPassword)
{
  return deriveKeyWithPassword(data[saltKey], masterPass).then(decryptionKey =>
  {
    return Promise.all([
      decryptionKey,
      decrypt(data[hmacSecretKey], decryptionKey)
    ]);
  }).catch(error =>
  {
    if (error == "master_password_required")
      throw error;

    console.error(error);
    throw "wrong_master_password";
  }).then(([decryptionKey, hmacSecret]) =>
  {
    let decryptActions = [];
    for (let key in data)
      if (key.startsWith(STORAGE_PREFIX))
        decryptActions.push(decrypt(data[key], decryptionKey));
    return Promise.all(decryptActions);
  }).then(entries =>
  {
    let mergeActions = [];
    for (let entry of entries)
    {
      if (!entry.type)
        mergeActions.push(setSite(entry));
      else if (entry.type == "generated2" || entry.type == "generated")
      {
        if (masterPass || entry.type == "generated")
        {
          let params = {
            masterPassword: masterPass || getMasterPassword(),
            domain: entry.site,
            name: entry.name,
            revision: entry.revision,
            length: entry.length,
            lower: entry.lower,
            upper: entry.upper,
            number: entry.number,
            symbol: entry.symbol
          };
          let action;
          if (entry.type == "generated2")
            action = derivePassword(params);
          else
            action = derivePasswordLegacy(params);
          mergeActions.push(action.then(password =>
          {
            let data = {
              type: "stored",
              site: entry.site,
              name: entry.name,
              revision: entry.revision,
              password
            };
            if (entry.notes)
              data.notes = entry.notes;
            return setPassword(data);
          }));
        }
        else
          mergeActions.push(setPassword(entry));
      }
      else if (entry.type == "stored")
        mergeActions.push(setPassword(entry));
    }
    return Promise.all(mergeActions);
  });
}

function import_(data, setRaw, setSite, setPassword, masterPass)
{
  return Promise.resolve().then(() =>
  {
    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      throw "unknown_data_format";
    }

    if (!data || typeof data != "object" ||
        data.application != "pfp" || (data.format != 2 && data.format != 3) ||
        !data.data || typeof data.data != "object" ||
        typeof data.data[saltKey] != "string" ||
        typeof data.data[hmacSecretKey] != "string")
    {
      throw "unknown_data_format";
    }

    return Promise.all([
      storage.get(saltKey, null),
      storage.get(hmacSecretKey, null)
    ]);
  }).then(([saltRaw, hmacSecretRaw]) =>
  {
    if (masterPass)
      return decryptThenImport(data.data, masterPass, setSite, setPassword);
    else if (saltRaw == data.data[saltKey] && hmacSecretRaw == data.data[hmacSecretKey])
    {
      // Backup was created with the same crypto parameters, we can just import
      // the entries as they are, without decrypting them first.
      return importUnchanged(data.data, setRaw);
    }
    else
      return decryptThenImport(data.data, null, setSite, setPassword);
  });
}

registerImporter(import_);
