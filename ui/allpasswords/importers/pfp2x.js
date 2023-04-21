/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {deriveKey, decryptData, derivePassword} from "./pfp2x/crypto.js";

const SALT_KEY = "salt";
const HMAC_SECRET_KEY = "hmac-secret";
const STORAGE_PREFIX = "site:";

export default async function(data, password)
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
      typeof data.data[SALT_KEY] != "string" ||
      typeof data.data[HMAC_SECRET_KEY] != "string")
  {
    throw "unknown_data_format";
  }

  if (!password)
    throw "password_required";

  let decryptionKey = await deriveKey({
    masterPassword: password,
    salt: data.data[SALT_KEY]
  });

  try
  {
    await decryptData(decryptionKey, data.data[HMAC_SECRET_KEY]);
  }
  catch (error)
  {
    console.error(error);
    throw "wrong_password";
  }

  let entries = [];
  let aliases = {};
  for (let key in data.data)
  {
    if (!key.startsWith(STORAGE_PREFIX))
      continue;

    let entry = JSON.parse(await decryptData(decryptionKey, data.data[key]));
    if (!entry.type)
    {
      if (entry.alias)
        aliases[entry.site] = entry.alias;
    }
    else if (entry.type == "generated2")
    {
      let params = {
        masterPassword: password,
        domain: entry.site,
        name: entry.name,
        revision: entry.revision,
        length: entry.length,
        lower: entry.lower,
        upper: entry.upper,
        number: entry.number,
        symbol: entry.symbol
      };
      let generated = derivePassword(params);

      entries.push({
        title: entry.name + (entry.revision ? " #" + entry.revision : ""),
        username: entry.name,
        password: generated,
        hostname: entry.site,
        notes: entry.notes || null
      });
    }
    else if (entry.type == "stored")
    {
      entries.push({
        title: entry.name + (entry.revision ? " #" + entry.revision : ""),
        username: entry.name,
        password: entry.password,
        hostname: entry.site,
        notes: entry.notes || null
      });
    }
  }

  return {
    entries,
    aliases
  };
}
