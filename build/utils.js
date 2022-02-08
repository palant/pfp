/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import fs from "fs/promises";
import path from "path";

import {MemoryFile} from "builder";

function getKeys(obj, keys)
{
  if (!obj || typeof obj != "object")
    return;

  if (Array.isArray(obj))
  {
    for (let i = 0; i < obj.length; i++)
      getKeys(obj[i], keys);
  }
  else
  {
    for (let key in obj)
    {
      keys.add(key);
      getKeys(obj[key], keys);
    }
  }
}

export function stringifyObject(obj)
{
  let keys = new Set();
  getKeys(obj, keys);

  return JSON.stringify(obj, Array.from(keys).sort(), 2);
}

export async function* jsonModify(files, modifier)
{
  for await (let file of files)
  {
    file = await file.read();

    let data = JSON.parse(file.contents);
    data = modifier(data) || data;
    yield new MemoryFile(file.path, stringifyObject(data));
  }
}

export async function* combineLocales(files)
{
  let locales = {};

  for await (let file of files)
  {
    file = await file.read();

    let parts = path.normalize(file.path).split(path.sep);
    parts = parts.slice(parts.lastIndexOf("locale") + 1);
    let locale = parts.shift();
    if (!locales.hasOwnProperty(locale))
      locales[locale] = {};

    let fileName = parts.pop();
    if (!fileName.startsWith("_"))
      parts.push(path.basename(fileName, ".json"));

    let prefix = "";
    if (parts.length)
      prefix = parts.join("@") + "@";

    let data = JSON.parse(file.buffer.toString());
    for (let name of Object.keys(data))
      locales[locale][prefix + name] = data[name];
  }

  for (let locale of Object.keys(locales))
    yield new MemoryFile(path.join("locale", locale + ".json"), stringifyObject(locales[locale]));
}

export async function* toChromeLocale(files)
{
  for await (let file of files)
  {
    let strings = JSON.parse(file.contents);
    let data = {};
    for (let key of Object.keys(strings))
      data[key] = {message: strings[key]};

    let locale = path.basename(file.path, ".json");
    let manifest = JSON.parse(await fs.readFile("./package.json"));
    data.name = {"message": manifest.title};
    data.description = {"message": manifest.description};
    if ("locales" in manifest && locale in manifest.locales)
    {
      let localized = manifest.locales[locale];
      if ("title" in localized)
        data.name.message = localized.title;
      if ("description" in localized)
        data.description.message = localized.description;
    }

    yield new MemoryFile(path.join("_locales", locale, "messages.json"), stringifyObject(data));
  }
}
