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

let gulp = require("gulp");
let source = require("vinyl-source-stream");
let less = require("gulp-less");
let rename = require("gulp-rename");
let merge = require("merge-stream");
let del = require("del");
let eslint = require("gulp-eslint");
let htmlhint = require("gulp-htmlhint");
let RSA = require("node-rsa");
let zip = require("gulp-zip");
let browserify = require("browserify");
let jsonModify = require("gulp-json-modify");

function readArg(prefix, defaultValue)
{
  for (let arg of process.argv)
    if (arg.startsWith(prefix))
      return arg.substr(prefix.length);
  return defaultValue;
}

function jpm(args)
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
}

function signCRX(keyFile)
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
}

function toChromeLocale()
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
}

gulp.task("default", ["xpi"], function()
{
});

gulp.task("build-jpm", ["validate"], function()
{
  return merge(
    gulp.src(["package.json", "LICENSE.TXT", "data/images/icon64.png"])
        .pipe(gulp.dest("build-jpm")),
    gulp.src("data/images/icon48.png")
        .pipe(rename("icon.png"))
        .pipe(gulp.dest("build-jpm")),
    gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "!data/images/icon48.png"])
        .pipe(gulp.dest("build-jpm/data")),
    gulp.src("data/**/*.less")
        .pipe(less())
        .pipe(gulp.dest("build-jpm/data")),
    gulp.src("lib/**/*.js")
        .pipe(gulp.dest("build-jpm/lib")),
    gulp.src("locale/**/*.properties")
        .pipe(gulp.dest("build-jpm/locale"))
  );
});

gulp.task("build-chrome", ["validate"], function()
{
  return merge(
    gulp.src("LICENSE.TXT")
        .pipe(gulp.dest("build-chrome")),
    gulp.src("manifest.json")
        .pipe(jsonModify({key: "version", value: require("./package.json").version}))
        .pipe(gulp.dest("build-chrome")),
    gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "chrome/data/**/*.js", "chrome/data/**/*.html"])
        .pipe(gulp.dest("build-chrome/data")),
    gulp.src(["data/**/*.less", "chrome/data/**/*.less"])
        .pipe(less())
        .pipe(gulp.dest("build-chrome/data")),
    browserify("chrome/lib/main.js", {"paths": "chrome/lib"})
        .bundle()
        .pipe(source("background.js"))
        .pipe(gulp.dest("build-chrome")),
    gulp.src("locale/**/*.properties")
        .pipe(toChromeLocale())
        .pipe(gulp.dest("build-chrome/_locales"))
  );
});

gulp.task("eslint-data", function()
{
  return gulp.src(["data/**/*.js", "chrome/data/**/*.js"])
             .pipe(eslint({envs: ["browser", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-lib", function()
{
  return gulp.src(["lib/**/*.js"])
             .pipe(eslint({envs: ["commonjs", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-chromelib", function()
{
  return gulp.src(["chrome/lib/**/*.js"])
             .pipe(eslint({envs: ["commonjs", "browser", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("htmlhint", function()
{
  return gulp.src(["data/**/*.html", "chrome/data/**/*.html"])
             .pipe(htmlhint({
               "title-require": false
             }))
             .pipe(htmlhint.failReporter());
});

gulp.task("validate", ["eslint-data", "eslint-lib", "eslint-chromelib", "htmlhint"], function()
{
});

gulp.task("xpi", ["build-jpm"], function()
{
  return jpm(["xpi"]);
});

gulp.task("post", ["build-jpm"], function()
{
  let postUrl = readArg("--post-url=", "http://localhost:8888/");
  if (/^\d+$/.test(postUrl))
    postUrl = "localhost:" + postUrl;
  if (postUrl.indexOf("://") < 0)
    postUrl = "http://" + postUrl;

  return jpm(["post", "--post-url", postUrl]);
});

gulp.task("watch", ["post"], function()
{
  gulp.watch(["data/**/*", "lib/**/*", "locale/**/*"], ["post"]);
});

gulp.task("crx", ["build-chrome"], function()
{
  let manifest = require("./package.json");
  let result = gulp.src(["build-chrome/**", "!build-chrome/**/.*", "!build-chrome/**/*.zip", "!build-chrome/**/*.crx"])
                   .pipe(zip("easypasswords-" + manifest.version + ".zip"));
  let keyFile = readArg("--private-key=");
  if (keyFile)
    result = result.pipe(signCRX(keyFile));
  return result.pipe(gulp.dest("build-chrome"));
});

gulp.task("clean", function()
{
  return del(["build-jpm", "build-chrome"]);
});
