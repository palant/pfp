/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let gulp = require("gulp");
let source = require("vinyl-source-stream");
let less = require("gulp-less");
let rename = require("gulp-rename");
let merge = require("merge-stream");
let del = require("del");
let eslint = require("gulp-eslint");
let htmlhint = require("gulp-htmlhint");
let stylelint = require("gulp-stylelint");
let zip = require("gulp-zip");
let browserify = require("browserify");
let jsonModify = require("gulp-json-modify");

let utils = require("./gulp-utils");

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
    gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "chrome/data/**/*.js", "chrome/data/**/*.html", "chrome/data/**/*.png"])
        .pipe(utils.convertHTML())
        .pipe(gulp.dest("build-chrome/data")),
    gulp.src(["data/**/*.less", "chrome/data/**/*.less"])
        .pipe(less())
        .pipe(gulp.dest("build-chrome/data")),
    browserify("chrome/lib/main.js", {"paths": "chrome/lib"})
        .bundle()
        .pipe(source("background.js"))
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
    gulp.src(["build-chrome/**", "!build-chrome/manifest.json"])
        .pipe(gulp.dest("build-webext")),
    gulp.src("build-chrome/manifest.json")
        .pipe(jsonModify({
          key: "applications",
          value: {
            gecko: {
              id: manifest.id
            }
          }
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

gulp.task("validate", ["eslint-node", "eslint-data", "eslint-lib", "eslint-chromelib", "htmlhint", "stylelint"], function()
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
