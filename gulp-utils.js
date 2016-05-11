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

function transform(modifier, opts)
{
  if (!opts)
    opts = {};

  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    if (opts.pathregexp && !opts.pathregexp.test(file.path))
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
      file.contents = new Buffer(contents, "utf-8");
      callback(null, file);
    }).catch(e =>
    {
      console.error(e);
      callback(e);
    });
  };
  return stream;
}
exports.transform = transform;

exports.jsonModify = function(modifier)
{
  return transform((filepath, contents) =>
  {
    let data = JSON.parse(contents);
    data = modifier(data) || data;
    return [filepath, JSON.stringify(data, null, 2)];
  });
};

exports.signCRX = function(keyFile)
{
  return transform((filepath, contents) =>
  {
    return new Promise((resolve, reject) =>
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
      let signature = privateKey.sign(contents, "buffer");

      let header = new Buffer(16);
      header.write("Cr24", 0);
      header.writeInt32LE(2, 4);
      header.writeInt32LE(publicKey.length, 8);
      header.writeInt32LE(signature.length, 12);
      return Buffer.concat([header, publicKey, signature, contents]);
    }).then(contents =>
    {
      return [filepath.replace(/\.zip$/, ".crx"), contents];
    });
  }, {raw: true});
};

exports.toChromeLocale = function()
{
  return transform((filepath, contents) =>
  {
    let locale = path.basename(filepath).replace(/\.properties$/, "");
    let lines = contents.split(/[\r\n]+/);
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

    return [
      path.join(path.dirname(filepath), locale.replace(/-/g, "_"), "messages.json"),
      JSON.stringify(data, null, 2)
    ];
  });
};

exports.reduceZxcvbnSize = function()
{
  return transform((filepath, contents) =>
  {
    // Shorten frequency lists
    contents = contents.replace(/(frequency_lists\s*=\s*{)([\s\S]*?)(})/, (match, prefix, value, postfix) =>
    {
      value = value.replace(/"(.*?)"/g, (match, list) =>
      {
        return '"' + list.split(/,/).slice(0, 200).join(",") + '"';
      });
      return prefix + value + postfix;
    });

    // Insert copyright notice and explanation for AMO editors
    contents = `
// The below is the official zxcvbn release with this message and copyright
// notice added, and with dictionaries shortened to 200 entries. For the
// transformation applied to the original file see
// https://github.com/palant/easypasswords/, function reduceZxcvbnSize in
// gulp-utils.js.

/*
Copyright (c) 2012-2015 Dan Wheeler and Dropbox, Inc.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

` + contents;

    return [filepath, contents];
  }, {pathregexp: /\bzxcvbn-[\d\.]+\.js$/});
};
