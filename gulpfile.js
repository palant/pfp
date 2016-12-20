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
let webpack = require("webpack-stream");

let utils = require("./gulp-utils");

gulp.task("default", ["xpi"], function()
{
});

function buildCommon(targetdir, platform, customTransform)
{
  return merge(
    gulp.src("LICENSE.TXT")
        .pipe(gulp.dest(`${targetdir}`)),
    gulp.src(["data/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", `${platform}/data/contentScript-compat.js`, `${platform}/data/**/*.html`, `${platform}/data/**/*.png`])
        .pipe(customTransform || utils.transform(null, {files: ["////"]}))
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src(["data/panel/zxcvbn-*.js", "data/panel/jsqr-*.js"])
        .pipe(gulp.dest(`${targetdir}/data/panel`)),
    gulp.src(["data/panel/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          },
          resolve: {
            root: path.resolve(process.cwd(), `${platform}/data`)
          },
          externals: {
            "zxcvbn": "var zxcvbn",
            "jsqr": "var JSQR"
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/panel`)),
    gulp.src(["data/allpasswords/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          },
          resolve: {
            root: path.resolve(process.cwd(), `${platform}/data`)
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/allpasswords`)),
    gulp.src(["data/**/*.scss", `${platform}/data/**/*.scss`])
        .pipe(sass())
        .pipe(gulp.dest(`${targetdir}/data`)),
    gulp.src([`${platform}/lib/init.js`, "lib/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          },
          resolve: {
            root: path.resolve(process.cwd(), `${platform}/lib`)
          },
          externals: function(context, request, callback)
          {
            if (platform == "jpm" && (request == "./package.json" || request == "chrome" || request.indexOf("sdk/") == 0))
              callback(null, "commonjs " + request);
            else
              callback();
          }
        }))
        .pipe(gulp.dest(`${targetdir}`))
  );
}

function buildWebExtCommon(targetdir)
{
  return merge(
    buildCommon(targetdir, "chrome"),
    gulp.src(["chrome/data/options/main.js"])
        .pipe(webpack({
          output: {
            filename: "index.js",
            pathinfo: true,
            library: "__webpack_require__"
          },
          resolve: {
            root: path.resolve(process.cwd(), "chrome/data")
          }
        }))
        .pipe(gulp.dest(`${targetdir}/data/options`)),
    gulp.src("locale/**/*.properties")
        .pipe(utils.toChromeLocale())
        .pipe(gulp.dest(`${targetdir}/_locales`))
  );
}

let jpmPages = new Map();

gulp.task("build-jpm-common", ["validate"], function()
{
  let manifest = require("./package.json");
  for (let info of [manifest.buttonPanel, manifest.contentPage])
  {
    if (!info)
      continue;

    jpmPages.set(path.resolve(process.cwd(), "data", info.contentURL), {
      url: info.contentURL,
      contentScripts: []
    });
  }

  let customTransform = utils.transform((filepath, contents) =>
  {
    // Convert page-loaded scripts to content scripts
    let page = jpmPages.get(filepath);
    return [filepath, contents.replace(/<script\b[^>]*\bsrc="(.*?)"[^>]*><\/script>/g, (match, src) =>
    {
      page.contentScripts.push(url.resolve(page.url, src));
      return "";
    })];
  }, {files: Array.from(jpmPages.keys())});

  return buildCommon("build-jpm", "jpm", customTransform);
});

gulp.task("build-jpm", ["build-jpm-common"], function()
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

          for (let key of ["buttonPanel", "contentPage"])
          {
            if (key in data)
            {
              for (let page of jpmPages.values())
              {
                if (page.url == data[key].contentURL)
                  data[key].contentScripts = page.contentScripts;
              }
            }
          }
        }))
        .pipe(gulp.dest("build-jpm")),
    gulp.src(["data/images/icon64.png"])
        .pipe(gulp.dest("build-jpm")),
    gulp.src("data/images/icon48.png")
        .pipe(rename("icon.png"))
        .pipe(gulp.dest("build-jpm")),
    gulp.src("locale/**/*.properties")
        .pipe(gulp.dest("build-jpm/locale"))
  );
});

gulp.task("build-chrome", ["validate"], function()
{
  return merge(
    buildWebExtCommon("build-chrome"),
    gulp.src("manifest.json")
        .pipe(utils.jsonModify(data =>
        {
          let manifest = require("./package.json");
          data.version = manifest.version;
          if ("buttonPanel" in manifest && "hotkey" in manifest.buttonPanel)
          {
            if (!data.commands)
              data.commands = {};
            data.commands._execute_browser_action = {
              suggested_key: {
                default: manifest.buttonPanel.hotkey
              }
            };
          }
        }))
        .pipe(gulp.dest("build-chrome"))
  );
});

gulp.task("build-webext", ["validate"], function()
{
  let manifest = require("./package.json");
  return merge(
    buildWebExtCommon("build-webext"),
    gulp.src("manifest.json")
        .pipe(utils.jsonModify(data =>
        {
          data.version = manifest.version;

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
  return gulp.src(["*.js", "test/**/*.js"])
             .pipe(eslint({envs: ["node", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-data", function()
{
  return gulp.src(["data/fillIn.js", "**/contentScript-compat.js"])
             .pipe(eslint({envs: ["browser", "es6"]}))
             .pipe(eslint.format())
             .pipe(eslint.failAfterError());
});

gulp.task("eslint-datamodules", function()
{
  return gulp.src(["data/**/*.js", "!data/fillIn.js", "!data/panel/zxcvbn-*.js", "!data/panel/jsqr-*.js", "chrome/data/**/*.js", "jpm/data/**/*.js",  "!**/contentScript-compat.js"])
             .pipe(eslint({envs: ["browser", "commonjs", "es6"]}))
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
  return gulp.src(["data/**/*.scss", "chrome/data/**/*.scss"])
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

gulp.task("validate", ["eslint-node", "eslint-data", "eslint-datamodules", "eslint-lib", "htmlhint", "stylelint"], function()
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

gulp.task("test", ["validate"], function()
{
  return gulp.src(["test/**/*.js"])
             .pipe(utils.runTests());
});

gulp.task("clean", function()
{
  return del(["build-jpm", "build-chrome", "build-webext"]);
});
