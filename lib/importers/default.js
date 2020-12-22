/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import storage, {saltKey, hmacSecretKey} from "../storage.js";
import {deriveKeyWithPassword, getMasterPassword} from "../masterPassword.js";
import {STORAGE_PREFIX, registerImporter} from "../passwords.js";
import {decrypt} from "../storage.js";
import {derivePassword} from "../crypto.js";

async function importUnchanged(data, setRaw)
{
  for (let key in data)
    if (key.startsWith(STORAGE_PREFIX))
      await setRaw(key, data[key]);
}

async function decryptThenImport(data, masterPass, setSite, setPassword)
{
  let decryptionKey = await deriveKeyWithPassword(data[saltKey], masterPass);
  let hmacSecret;
  try
  {
    hmacSecret = await decrypt(data[hmacSecretKey], decryptionKey);
  }
  catch (error)
  {
    if (error == "master_password_required")
      throw error;

    console.error(error);
    throw "wrong_master_password";
  }

  for (let key in data)
  {
    if (!key.startsWith(STORAGE_PREFIX))
      continue;

    let entry = await decrypt(data[key], decryptionKey);
    if (!entry.type)
      await setSite(entry);
    else if (entry.type == "generated2")
    {
      if (masterPass)
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
        let password = await derivePassword(params);
        let data = {
          type: "stored",
          site: entry.site,
          name: entry.name,
          revision: entry.revision,
          password
        };
        if (entry.notes)
          data.notes = entry.notes;
        await setPassword(data);
      }
      else
        await setPassword(entry);
    }
    else if (entry.type == "stored")
      await setPassword(entry);
  }
}

async function import_(data, setRaw, setSite, setPassword, masterPass)
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

  let saltRaw = await storage.get(saltKey, null);
  let hmacSecretRaw = await storage.get(hmacSecretKey, null);
  if (masterPass)
    await decryptThenImport(data.data, masterPass, setSite, setPassword);
  else if (saltRaw == data.data[saltKey] && hmacSecretRaw == data.data[hmacSecretKey])
  {
    // Backup was created with the same crypto parameters, we can just import
    // the entries as they are, without decrypting them first.
    await importUnchanged(data.data, setRaw);
  }
  else
    await decryptThenImport(data.data, null, setSite, setPassword);
}

registerImporter(import_);
