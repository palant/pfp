/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import fs from "fs";
import path from "path";

import alias from "@rollup/plugin-alias";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import vue from "rollup-plugin-vue";

import {series, parallel, Files, MemoryFile} from "builder";

import eslint from "./build/eslint.js";
import htmlValidate from "./build/html-validate.js";
import mocha from "./build/mocha.js";
import rollup from "./build/rollup.js";
import sass from "./build/sass.js";
import stylelint from "./build/stylelint.js";
import * as utils from "./build/utils.js";
import zip from "./build/zip.js";
import globalLoader from "./globalLoader.js";
import iife from "./iifeChunks.js";
import localeLoader from "./localeLoader.js";
import replace from "./replacePlugin.js";
import workerLoader from "./workerLoader.js";
import testEnv from "./test-env/setup.js";

const VERSION = JSON.parse(fs.readFileSync("./manifest.json")).version;

function rollupOptions(builder, overrides = {})
{
  let prePlugins = overrides.plugins || [];
  let postPlugins = overrides.postPlugins || [];
  delete overrides.plugins;
  delete overrides.postPlugins;

  return [{
    plugins: [
      ...prePlugins,
      globalLoader({
        jsqr: "JSQR",
        zxcvbn: "zxcvbn"
      }),
      alias({
        entries: [
          {
            find: "vue",
            replacement: (
              builder.hasFlag("dev")
                ? "vue/dist/vue.runtime.esm-browser.js"
                : "vue/dist/vue.runtime.esm-browser.prod.js"
            )
          }
        ]
      }),
      resolve(),
      commonjs({
        include: ["node_modules/**"]
      }),
      vue({
        template: {
          compilerOptions: {
            whitespace: "condense"
          }
        }
      }),
      ...postPlugins
    ]
  }, Object.assign({
    format: "iife",
    compact: true
  }, overrides)];
}

function addReloader(files, targetDir)
{
  return [
    files,
    this.src()
        .pipe(() => [new MemoryFile("random.json", String(Math.random()))])
        .dest(targetDir)
  ];
}

function createRelease(files, fileName, targetDir)
{
  return files
    .rename(filepath => filepath.split(path.sep).slice(1).join(path.sep))
    .pipe(async function*(files)
    {
      for await (let file of files)
      {
        if (file.path == "manifest.json")
        {
          file = await file.read();

          let data = JSON.parse(file.contents);
          let index = data.background.scripts.indexOf("reloader.js");
          if (index >= 0)
            data.background.scripts.splice(index, 1);
          yield new MemoryFile(file.path, utils.stringifyObject(data));
        }
        else if (file.path != "reloader.js" && file.path != "random.json")
          yield file;
      }
    })
    .pipe(zip, fileName)
    .dest(targetDir);
}

function eslintTask()
{
  return this.src(["*.js", "*.json", "ui/**/*.js", "ui/**/*.vue", "lib/**/*.js",
                   "test/**/*.js", "test-lib/**/*.js", "web/**/*.js",
                   "contentScript/**/*.js", "worker/**/*.js",
                   "locale/**/*.json", "!ui/third-party/**"])
             .pipe(eslint);
}

function htmlValidateTask()
{
  return this.src(["ui/**/*.html", "web/**/*.html"])
             .pipe(htmlValidate);
}

function stylelintTask()
{
  return this.src(["ui/**/*.scss"])
             .pipe(stylelint, {
               customSyntax: "postcss-scss"
             });
}

export {
  eslintTask as eslint,
  htmlValidateTask as htmlValidate,
  stylelintTask as stylelint
};
export let validate = parallel(eslintTask, htmlValidateTask, stylelintTask);

let common = series(validate, function()
{
  return [
    this.src(["LICENSE.txt", "ui/**/*.html", "ui/images/**", "ui/third-party/**"]),
    this.src("contentScript/fillIn.js")
        .pipe(rollup, ...rollupOptions(this)),
    this.src("ui/*/main.js")
        .pipe(rollup, ...rollupOptions(this, {
          format: "es",
          manualChunks(id)
          {
            if (id.endsWith("/vue.js") || id.endsWith("/clipboard.js") || id.indexOf("/ui/components/") >= 0)
              return "shared";
            return null;
          },
          chunkFileNames: "ui/[name].js",
          postPlugins: [iife()]
        })),
    this.src("ui/**/*.scss")
        .pipe(sass),
    this.src("locale/**/*.json")
        .pipe(utils.combineLocales)
        .pipe(utils.toChromeLocale),
    this.src("lib/main.js")
        .pipe(rollup, ...rollupOptions(this))
        .rename("background.js"),
    this.src("lib/reloader.js")
        .rename("reloader.js"),
    this.src("worker/scrypt.js")
        .pipe(rollup, ...rollupOptions(this))
  ];
});

let chromeMain = series(common, function(common)
{
  return [
    common.dest("build-chrome"),
    this.src("manifest.json")
        .pipe(utils.jsonModify, data =>
        {
          delete data.applications;
        })
        .dest("build-chrome")
  ];
});

export let chrome = series(chromeMain, async function(main)
{
  return addReloader.call(this, main, "build-chrome");
});

export let crx = series(chrome, function(files)
{
  return createRelease(files, `pfp-${VERSION}.zip`, "build-chrome");
});

export let watchChrome = series(chrome, function()
{
  return this.src(["*.js", "*.json", "ui/**/*", "lib/**/*", "contentScript/**/*", "worker/**/*", "locale/**/*"])
             .watch(chrome);
});

let firefoxMain = series(common, function(common)
{
  return [
    common.dest("build-firefox"),
    this.src("manifest.json")
        .pipe(utils.jsonModify, data =>
        {
          delete data.minimum_chrome_version;
          delete data.minimum_opera_version;
          delete data.background.persistent;

          data.browser_action.browser_style = false;
        })
        .dest("build-firefox")
  ];
});

export let firefox = series(firefoxMain, function(main)
{
  return addReloader.call(this, main, "build-firefox");
});

export let xpi = series(firefox, function(files)
{
  return createRelease(files, `pfp-${VERSION}.xpi`, "build-firefox");
});

export let watchFirefox = series(firefox, function()
{
  return this.src(["*.js", "*.json", "ui/**/*", "lib/**/*", "contentScript/**/*", "worker/**/*", "locale/**/*"])
             .watch(firefox);
});

export let web = series(validate, function()
{
  return new Files(
    this.src(["LICENSE.txt", "ui/images/**", "ui/third-party/**", "web/**/*.html"]),
    this.src(["ui/**/*.scss", "!ui/options/options.scss", "web/**/*.scss"])
        .pipe(sass),
    this.src("web/index.js")
        .pipe(rollup, ...rollupOptions(this, {
          plugins: [
            replace({
              [path.resolve(process.cwd(), "lib", "browserAPI.js")]: path.resolve(process.cwd(), "web", "backgroundBrowserAPI.js"),
              [path.resolve(process.cwd(), "ui", "browserAPI.js")]: path.resolve(process.cwd(), "web", "contentBrowserAPI.js")
            }),
            workerLoader(/\/scrypt\.js$/),
            localeLoader(path.resolve(process.cwd(), "locale", "en_US"))
          ],
          postPlugins: [
            babel.default({
              retainLines: true,
              compact: false,
              babelrc: false,
              babelHelpers: "runtime",
              extensions: [".js", ".vue"],
              presets: ["@babel/preset-env"],
              plugins: [
                ["@babel/transform-runtime"]
              ]
            })
          ]
        }))
  )
    .rename(path => path.replace(/^(ui|web[/\\])/, ""))
    .dest("build-web");
});

export let webZip = series(web, function(files)
{
  return createRelease(files, `pfp-web-${VERSION}.zip`, "build-web");
});

export let test = series(validate, function()
{
  let testFile = this.getFlag("test");
  if (!testFile)
    testFile = "**/*.js";
  else if (!testFile.endsWith(".js"))
    testFile += ".js";

  return this.src("test/" + testFile)
             .pipe(async function*(files)
             {
               testEnv.setup();
               try
               {
                 yield* await mocha(files, {
                   timeout: 10000
                 });
               }
               finally
               {
                 testEnv.teardown();
               }
             });
});

export function clean()
{
  this.src(["build-chrome/**", "build-firefox/**", "build-web/**"])
      .rm();
}

export let all = parallel(xpi, crx, webZip);
export default all;
