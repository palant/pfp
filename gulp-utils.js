/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import fs from "fs";
import path from "path";
import {spawn} from "child_process";
import {Duplex, Transform} from "stream";
import Mocha from "mocha";

import testEnv from "./test-env/setup.js";

export function readArg(prefix, defaultValue)
{
  for (let arg of process.argv)
    if (arg.startsWith(prefix))
      return arg.substr(prefix.length);
  return defaultValue;
}

export function transform(modifier, opts)
{
  if (!opts)
    opts = {};

  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    if (opts.files && opts.files.indexOf(file.path) < 0)
    {
      callback(null, file);
      return;
    }

    Promise.resolve().then(() =>
    {
      let contents = opts.raw ? file.contents : file.contents.toString("utf-8");
      return modifier(file.path, contents);
    }).then(([filepath, contents]) =>
    {
      file.path = filepath;
      file.contents = Buffer.from(contents, "utf-8");
      callback(null, file);
    }).catch(e =>
    {
      console.error(e);
      callback(e);
    });
  };
  return stream;
}

export function jsonModify(modifier, newName)
{
  return transform((filepath, contents) =>
  {
    let data = JSON.parse(contents);
    data = modifier(data) || data;
    if (newName)
      filepath = path.resolve(filepath, "..", newName);
    return [filepath, JSON.stringify(data, null, 2)];
  });
}

export function combineLocales()
{
  let rootDir = path.join(process.cwd(), "locale");
  let locales = {};
  let files = {};

  let stream = new Duplex({objectMode: true});

  stream._write = (file, encoding, callback) =>
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    let parts = path.relative(rootDir, file.path).split(path.sep);
    let locale = parts.shift();
    if (!locales.hasOwnProperty(locale))
    {
      locales[locale] = {};
      files[locale] = file;
    }

    let fileName = parts.pop();
    if (!fileName.startsWith("_"))
      parts.push(path.basename(fileName, ".json"));

    let prefix = "";
    if (parts.length)
      prefix = parts.join("@") + "@";

    let data = JSON.parse(file.contents.toString("utf-8"));
    for (let name of Object.keys(data))
      locales[locale][prefix + name] = data[name];

    callback(null);
  };

  stream._read = (...params) =>
  {
  };

  stream.on("finish", () =>
  {
    for (let locale of Object.keys(locales))
    {
      let file = files[locale];
      file.contents = Buffer.from(JSON.stringify(locales[locale], null, 2), "utf-8");
      file.path = path.join(process.cwd(), "locale", locale + ".json");
      stream.push(file);
    }
    stream.push(null);
  });

  return stream;
}

export function toChromeLocale()
{
  return transform((filepath, contents) =>
  {
    let strings = JSON.parse(contents);
    let data = {};
    for (let key of Object.keys(strings))
      data[key] = {message: strings[key]};

    let locale = path.basename(filepath, ".json");
    let manifest = JSON.parse(fs.readFileSync("./package.json"));
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

    return [
      path.join(path.dirname(filepath), locale, "messages.json"),
      JSON.stringify(data, null, 2)
    ];
  });
}

export function runTests()
{
  testEnv.setup();

  let mocha = new Mocha({
    timeout: 10000
  });

  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.path)
      throw new Error("Unexpected file type");

    mocha.addFile(file.path);
    callback(null);
  };

  stream._flush = function(callback)
  {
    mocha.loadFilesAsync().then(function()
    {
      return new Promise((resolve, reject) =>
      {
        mocha.run(failures => failures ? reject(new Error(`${failures} test(s) failed`)) : resolve());
      });
    }).then(() => callback(null)).catch(error => callback(error));
  };

  stream.on("close", () => testEnv.teardown());
  stream.on("error", () => testEnv.teardown());

  return stream;
}
