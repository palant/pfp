/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let path = require("path");
let gulp = require("gulp");
let less = require("gulp-less");
let rename = require("gulp-rename");
let merge = require("merge-stream");
let del = require("del");
let eslint = require("gulp-eslint");
let htmlhint = require("gulp-htmlhint");
let stylelint = require("gulp-stylelint");
let zip = require("gulp-zip");
let webpack = require("webpack-stream");

let utils = require("./gulp-utils");

gulp.task("default", ["xpi"], function()
{
});

gulp.task("build-jpm", ["validate"], function()
{
  return merge(
    gulp.src("package.json")
        .pipe(utils.jsonModify(data =>
        {
          let whitelist = new Set([
            "name", "title", "id", "version", "description", "main", "author",
            "homepage", "permissions", "preferences", "engines", "license",
            "buttonPanel", "contentPage"
          ]);
          for (let key of Object.keys(data))
          {
            if (!whitelist.has(key))
              delete data[key];
          }
        }))
        .pipe(gulp.dest("build-jpm")),
    gulp.src(["LICENSE.TXT", "data/images/icon64.png"])
        .pipe(gulp.dest("build-jpm")),
    gulp.src("data/images/icon48.png")
        .pipe(rename("icon.png"))
        .pipe(gulp.dest("build-jpm")),
    gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "!data/images/icon48.png"])
        .pipe(utils.reduceZxcvbnSize())
        .pipe(gulp.dest("build-jpm/data")),
    gulp.src("data/**/*.less")
        .pipe(less())
        .pipe(gulp.dest("build-jpm/data")),
    gulp.src(["jpm/lib/init.js", "lib/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true
          },
          resolve: {
            root: path.resolve(process.cwd(), "jpm/lib")
          },
          externals: function(context, request, callback)
          {
            if (request == "./package.json" || request == "chrome" || request.indexOf("sdk/") == 0)
              callback(null, "commonjs " + request);
            else
              callback();
          }
        }))
        .pipe(gulp.dest("build-jpm")),
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
        .pipe(utils.jsonModify(data =>
        {
          data.version = require("./package.json").version;
        }))
        .pipe(gulp.dest("build-chrome")),
    gulp.src("package.json")
        .pipe(utils.jsonModify(data =>
        {
          let prefs = {};
          if (data.preferences)
            for (let pref of data.preferences)
              prefs[pref.name] = pref.value;
          return prefs;
        }, "prefs.json"))
        .pipe(gulp.dest("build-chrome")),
    gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "chrome/data/**/*.js", "chrome/data/**/*.html", "chrome/data/**/*.png"])
        .pipe(utils.transform((filepath, contents) =>
        {
          // Process conditional comments
          return [filepath, contents.replace(/<!--\[ifchrome\b([\s\S]*?)\]-->/g, "$1")];
        }, {pathregexp: /\.html$/}))
        .pipe(utils.reduceZxcvbnSize())
        .pipe(gulp.dest("build-chrome/data")),
    gulp.src(["data/**/*.less", "chrome/data/**/*.less"])
        .pipe(less())
        .pipe(gulp.dest("build-chrome/data")),
    gulp.src("lib/main.js")
        .pipe(webpack({
          output: {
            filename: "background.js",
            pathinfo: true
          },
          resolve: {
            root: path.resolve(process.cwd(), "chrome/lib")
          }
        }))
        .pipe(gulp.dest("build-chrome")),
    gulp.src("locale/**/*.properties")
        .pipe(utils.toChromeLocale())
        .pipe(gulp.dest("build-chrome/_locales"))
  );
});

gulp.task("build-webext", ["build-chrome"], function()
{
  let manifest = require("./package.json");
  return merge(
    gulp.src(["build-chrome/**", "!build-chrome/manifest.json", "!build-chrome/**/*.crx", "!build-chrome/**/*.zip"])
        .pipe(gulp.dest("build-webext")),
    gulp.src("build-chrome/manifest.json")
        .pipe(utils.jsonModify(data =>
        {
          delete data.minimum_chrome_version;
          let index = data.permissions.indexOf("unlimitedStorage");
          if (index >= 0)
            data.permissions.splice(index, 1);

          data.applications = {
            gecko: {
              id: manifest.id
            }
          };
          data.browser_action.browser_style = false;
        }))
        .pipe(gulp.dest("build-webext"))
  );
});

gulp.task("eslint-node", function()
{
  return gulp.src(["*.js"])
             .pipe(eslint({envs: ["node", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-data", function()
{
  return gulp.src(["data/**/*.js", "chrome/data/**/*.js", "!data/panel/zxcvbn-*.js"])
             .pipe(eslint({envs: ["browser", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-lib", function()
{
  return gulp.src(["lib/**/*.js", "jpm/lib/**/*.js", "chrome/lib/**/*.js"])
             .pipe(eslint({
               envs: ["commonjs", "es6"],
               globals: {
                 external: false,
                 crypto: false,
                 TextEncoder: false,
                 TextDecoder: false,
                 atob: false,
                 btoa: false,
                 setTimeout: false,
                 clearTimeout: false,
                 URL: false
               }
             }))
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

gulp.task("stylelint", function()
{
  return gulp.src(["data/**/*.less", "chrome/data/**/*.less"])
             .pipe(stylelint({
               "failAfterError": true,
               "syntax": "less",
               "config": {
                 "extends": "stylelint-config-standard",
                 "rules": {
                   "block-opening-brace-newline-before": "always",
                   "block-opening-brace-newline-after": "always",
                   "block-opening-brace-space-before": null,
                   "block-opening-brace-space-after": null
                 }
               },
               "reporters": [
                 {
                   "formatter": "string",
                   "console": true
                 }
               ]
             }));
});

gulp.task("validate", ["eslint-node", "eslint-data", "eslint-lib", "htmlhint", "stylelint"], function()
{
});

gulp.task("xpi", ["build-jpm"], function()
{
  return utils.jpm(["xpi"]);
});

gulp.task("post", ["build-jpm"], function()
{
  let postUrl = utils.readArg("--post-url=", "http://localhost:8888/");
  if (/^\d+$/.test(postUrl))
    postUrl = "localhost:" + postUrl;
  if (postUrl.indexOf("://") < 0)
    postUrl = "http://" + postUrl;

  return utils.jpm(["post", "--post-url", postUrl]);
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
  let keyFile = utils.readArg("--private-key=");
  if (keyFile)
    result = result.pipe(utils.signCRX(keyFile));
  return result.pipe(gulp.dest("build-chrome"));
});

gulp.task("webext", ["build-webext"], function()
{
  let manifest = require("./package.json");
  return gulp.src(["build-webext/**", "!build-webext/**/.*", "!build-webext/**/*.xpi"])
             .pipe(zip("easypasswords-" + manifest.version + ".xpi"))
             .pipe(gulp.dest("build-webext"));
});

gulp.task("clean", function()
{
  return del(["build-jpm", "build-chrome", "build-webext"]);
});
