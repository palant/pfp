/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let path = require("path");
let url = require("url");

let del = require("del");
let gulp = require("gulp");
let eslint = require("gulp-eslint");
let htmlhint = require("gulp-htmlhint");
let rename = require("gulp-rename");
let sass = require("gulp-sass");
let merge = require("merge-stream");
let stylelint = require("gulp-stylelint");
let zip = require("gulp-zip");
let webpack = require("webpack2-stream-watch");

let utils = require("./gulp-utils");

gulp.task("default", ["xpi"], function()
{
});

function buildWorkers(targetdir)
{
  let resolveConfig = {
    modules: [path.resolve(__dirname, "third-party")]
  };

  if (targetdir == "build-test")
  {
    resolveConfig.alias = {
      "../lib/typedArrayConversion$": path.resolve(__dirname, "test-lib", "typedArrayConversion.js")
    };
  }

  return merge(
    gulp.src(["data/pbkdf2.js"])
        .pipe(webpack({
          output: {
            filename: "pbkdf2.js",
            pathinfo: true
          },
          resolve: resolveConfig
        }))
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src(["data/scrypt.js"])
        .pipe(webpack({
          output: {
            filename: "scrypt.js",
            pathinfo: true
          },
          resolve: resolveConfig
        }))
        .pipe(gulp.dest(`${targetdir}/data`))
  );
}

function buildCommon(targetdir)
{
  return merge(
    gulp.src("LICENSE.TXT")
        .pipe(gulp.dest(`${targetdir}`)),
    gulp.src(["data/**/*.html", "data/**/*.png", "data/**/*.svg"])
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src(["data/panel/zxcvbn-*.js", "data/panel/jsqr-*.js"])
        .pipe(gulp.dest(`${targetdir}/data/panel`)),
    gulp.src(["data/fillIn.js"])
        .pipe(webpack({
          output: {
            filename: "fillIn.js",
            pathinfo: true
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src(["data/platform.js", "data/panel/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          },
          externals: {
            "zxcvbn": "var zxcvbn",
            "jsqr": "var JSQR"
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/panel`)),
    gulp.src(["data/platform.js", "data/allpasswords/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/allpasswords`)),
    gulp.src(["data/platform.js", "data/options/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/options`)),
    gulp.src(["data/**/*.scss"])
        .pipe(sass())
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src("locale/**/*.properties")
        .pipe(utils.toChromeLocale())
        .pipe(gulp.dest(`${targetdir}/_locales`)),
    gulp.src(["lib/platform.js", "lib/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          }
        }))
        .pipe(gulp.dest(`${targetdir}`)),
    gulp.src(["data/reloader.js"])
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src(["package.json"])
        .pipe(utils.jsonModify(data => Math.random(), "random.json"))
        .pipe(gulp.dest(`${targetdir}`)),
    buildWorkers(targetdir)
  );
}

function removeReloader(data)
{
  let index = data.background.scripts.indexOf("data/reloader.js");
  if (index >= 0)
    data.background.scripts.splice(index, 1);
}

gulp.task("build-chrome", ["validate"], function()
{
  return merge(
    buildCommon("build-chrome"),
    gulp.src("manifest.json")
        .pipe(utils.jsonModify(data =>
        {
          delete data.applications;
        }))
        .pipe(gulp.dest("build-chrome"))
  );
});

gulp.task("watch-chrome", ["build-chrome"], function()
{
  gulp.watch(["*.js", "*.json", "data/**/*", "lib/**/*", "locale/**/*"], ["build-chrome"]);
});

gulp.task("build-firefox", ["validate"], function()
{
  return merge(
    buildCommon("build-firefox"),
    gulp.src("manifest.json")
        .pipe(utils.jsonModify(data =>
        {
          delete data.minimum_chrome_version;
          delete data.minimum_opera_version;
          delete data.background.persistent;

          data.browser_action.browser_style = false;
        }))
        .pipe(gulp.dest("build-firefox"))
  );
});

gulp.task("build-test", ["validate"], function()
{
  return buildWorkers("build-test");
});

gulp.task("watch-firefox", ["build-firefox"], function()
{
  gulp.watch(["*.js", "*.json", "data/**/*", "lib/**/*", "locale/**/*"], ["build-firefox"]);
});

gulp.task("eslint-node", function()
{
  return gulp.src(["*.js", "test/**/*.js", "test-lib/**/*.js"])
             .pipe(eslint({envs: ["node", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-datamodules", function()
{
  return gulp.src(["data/**/*.js", "!data/panel/zxcvbn-*.js", "!data/panel/jsqr-*.js", "!data/panel/formatter.js"])
             .pipe(eslint({envs: ["browser", "commonjs", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-lib", function()
{
  return gulp.src(["lib/**/*.js"])
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
  return gulp.src(["data/**/*.html"])
             .pipe(htmlhint({
               "title-require": false
             }))
             .pipe(htmlhint.failReporter());
});

gulp.task("stylelint", function()
{
  return gulp.src(["data/**/*.scss"])
             .pipe(stylelint({
               "failAfterError": true,
               "syntax": "scss",
               "config": {
                 "extends": "stylelint-config-standard",
                 "rules": {
                   "block-opening-brace-newline-before": "always",
                   "block-opening-brace-newline-after": "always",
                   "block-opening-brace-space-before": null,
                   "block-opening-brace-space-after": null,
                   "at-rule-no-unknown": [true, {"ignoreAtRules": ["mixin", "include"]}],
                   "at-rule-empty-line-before": ["always", {"ignore": ["all-nested"]}]
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

gulp.task("validate", ["eslint-node", "eslint-datamodules", "eslint-lib", "htmlhint", "stylelint"], function()
{
});

gulp.task("crx", ["build-chrome"], function()
{
  let manifest = require("./manifest.json");
  let result = merge(
    gulp.src([
      "build-chrome/**",
      "!build-chrome/manifest.json", "!build-chrome/data/reloader.js", "!build-chrome/random.json",
      "!build-chrome/**/.*", "!build-chrome/**/*.zip", "!build-chrome/**/*.crx"
    ]),
    gulp.src("build-chrome/manifest.json").pipe(utils.jsonModify(removeReloader))
  ).pipe(zip("pfp-" + manifest.version + ".zip"));
  let keyFile = utils.readArg("--private-key=");
  if (keyFile)
    result = result.pipe(utils.signCRX(keyFile));
  return result.pipe(gulp.dest("build-chrome"));
});

gulp.task("xpi", ["build-firefox"], function()
{
  let manifest = require("./manifest.json");
  return merge(
    gulp.src([
      "build-firefox/**",
      "!build-chrome/manifest.json", "!build-firefox/data/reloader.js", "!build-firefox/random.json",
      "!build-firefox/**/.*", "!build-firefox/**/*.xpi"
    ]),
    gulp.src("build-firefox/manifest.json").pipe(utils.jsonModify(removeReloader))
  ).pipe(zip("pfp-" + manifest.version + ".xpi")).pipe(gulp.dest("build-firefox"));
});

gulp.task("test", ["validate", "build-test"], function()
{
  return gulp.src(["test/**/*.js"])
             .pipe(utils.runTests());
});

gulp.task("clean", function()
{
  return del(["build-chrome", "build-firefox"]);
});
