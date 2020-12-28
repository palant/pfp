/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {spawn} from "child_process";
import fs from "fs";
import path from "path";
import {Duplex, Transform} from "stream";

import Mocha from "mocha";
import {rollup} from "rollup";
import File from "vinyl";

import testEnv from "./test-env/setup.js";

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

export function hasArg(arg)
{
  return process.argv.includes(arg);
}

export function readArg(prefix, defaultValue)
{
  for (let arg of process.argv)
    if (arg.startsWith(prefix))
      return arg.substr(prefix.length);
  return defaultValue;
}

export function transform(modifier, finalizer)
{
  let stream = new Transform({objectMode: true});
  stream._transform = async function(file, encoding, callback)
  {
    try
    {
      if (!file.isBuffer())
        throw new Error("Unexpected file type");

      let contents = file.contents.toString("utf-8");
      let result = await modifier(file.path, contents);
      if (result)
      {
        [file.path, contents] = result;
        file.contents = Buffer.from(contents, "utf-8");
        this.push(file);
      }
      callback(null);
    }
    catch (e)
    {
      console.error(e);
      callback(e);
    }
  };

  if (finalizer)
  {
    stream._flush = async function(callback)
    {
      try
      {
        let files = await finalizer();
        for (let [path, contents] of files)
        {
          this.push(new File({
            path: path,
            contents: Buffer.from(contents, "utf-8")
          }));
        }
        callback(null);
      }
      catch (e)
      {
        console.error(e);
        callback(e);
      }
    };
  }
  return stream;
}

export function rollupStream(inputOptions, outputOptions)
{
  let files = [];

  return transform(filepath => void files.push(filepath), async function()
  {
    let chunkPaths = {};
    for (let file of files)
    {
      let chunkName = file.replace(/\W/g, "_");
      chunkPaths[chunkName] = file;
    }
    inputOptions.input = files.length == 1 ? files[0] : chunkPaths;

    let bundle = await rollup(inputOptions);
    let {output} = await bundle.generate(outputOptions);

    let result = [];
    for (let chunk of output)
    {
      if (!chunk.code)
        throw new Error("Unexpected rollup output");

      let filepath = chunkPaths[chunk.name];
      result.push([filepath || chunk.fileName, chunk.code]);
    }
    return result;
  });
}

export function jsonModify(modifier, newName)
{
  return transform((filepath, contents) =>
  {
    let data = JSON.parse(contents);
    data = modifier(data) || data;
    if (newName)
      filepath = path.resolve(filepath, "..", newName);
    return [filepath, stringifyObject(data)];
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
      file.contents = Buffer.from(stringifyObject(locales[locale]), "utf-8");
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
      stringifyObject(data)
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

  stream._flush = async function(callback)
  {
    try
    {
      await mocha.loadFilesAsync();
      await new Promise((resolve, reject) =>
      {
        mocha.run(failures => failures ? reject(new Error(`${failures} test(s) failed`)) : resolve());
      });
      callback(null);
    }
    catch (e)
    {
      callback(e);
    }
  };

  stream.on("close", () => testEnv.teardown());
  stream.on("error", () => testEnv.teardown());

  return stream;
}
