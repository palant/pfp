/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let fs = require("fs");
let path = require("path");
let spawn = require("child_process").spawn;
let Transform = require("stream").Transform;

let RSA = require("node-rsa");

exports.readArg = function(prefix, defaultValue)
{
  for (let arg of process.argv)
    if (arg.startsWith(prefix))
      return arg.substr(prefix.length);
  return defaultValue;
};

exports.jpm = function(args)
{
  return new Promise((resolve, reject) =>
  {
    let builddir = path.resolve(process.cwd(), "build-jpm");
    let jpm = path.resolve(process.cwd(), "node_modules/.bin/jpm");
    let ps = spawn(jpm, args, {cwd: builddir});
    ps.stdout.pipe(process.stdout);
    ps.stderr.pipe(process.stderr);
    ps.on("close", resolve);
  });
};

exports.signCRX = function(keyFile)
{
  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    new Promise((resolve, reject) =>
    {
      fs.readFile(keyFile, function(error, data)
      {
        if (error)
          reject(error);
        else
          resolve(data);
      });
    }).then(keyData =>
    {
      let privateKey = RSA(keyData, {signingScheme: "pkcs1-sha1"});
      let publicKey = privateKey.exportKey("pkcs8-public-der");
      let signature = privateKey.sign(file.contents, "buffer");

      let header = new Buffer(16);
      header.write("Cr24", 0);
      header.writeInt32LE(2, 4);
      header.writeInt32LE(publicKey.length, 8);
      header.writeInt32LE(signature.length, 12);
      return Buffer.concat([header, publicKey, signature, file.contents]);
    }).then(contents =>
    {
      file.path = file.path.replace(/\.zip$/, ".crx");
      file.contents = contents;
      callback(null, file);
    }).catch(function(error)
    {
      console.error(error);
      callback(error);
    });
  };
  return stream;
};

exports.toChromeLocale = function()
{
  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    let locale = path.basename(file.path).replace(/\.properties$/, "");
    let lines = file.contents.toString("utf-8").split(/[\r\n]+/);
    let data = {};
    for (let line of lines)
    {
      if (/^\s*#/.test(line))
        continue;

      let parts = line.split(/\s*=\s*/, 2);
      if (parts.length < 2)
        continue;

      data[parts[0].replace(/-/g, "_")] = {"message": parts[1]};
    }

    let manifest = require("./package.json");
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

    file.path = path.join(path.dirname(file.path), locale.replace(/-/g, "_"), "messages.json");
    file.contents = new Buffer(JSON.stringify(data), "utf-8");
    callback(null, file);
  };
  return stream;
};

exports.convertHTML = function()
{
  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    if (/\.html$/.test(file.path))
    {
      let source = file.contents.toString("utf-8");

      // Remove type attribute from scripts
      source = source.replace(/<script\s+type="[^"]*"/g, "<script");

      // Process conditional comments
      source = source.replace(/<!--\[ifchrome\b([\s\S]*?)\]-->/g, "$1");

      file.contents = new Buffer(source, "utf-8");
    }
    callback(null, file);
  };
  return stream;
};
