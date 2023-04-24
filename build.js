/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import fs from "fs";

import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import vue from "rollup-plugin-vue";

import {series, parallel, MemoryFile} from "builder";

import eslint from "./build/eslint.js";
import htmlValidate from "./build/html-validate.js";
import rollup from "./build/rollup.js";
import sass from "./build/sass.js";
import stylelint from "./build/stylelint.js";
import * as utils from "./build/utils.js";
import zip from "./build/zip.js";
import iife from "./build/rollup/iifeChunks.js";

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

function addReloader(files)
{
  return [
    files.pipe(async function*(files)
    {
      for await (let file of files)
      {
        if (file.path == "manifest.json")
        {
          file = await file.read();

          let data = JSON.parse(file.contents);
          data.background.scripts.push("reloader.js");
          yield new MemoryFile(file.path, utils.stringifyObject(data));
        }
        else
          yield file;
      }
    }),
    this.src("lib/reloader.js")
        .rename("reloader.js"),
    new MemoryFile("random.json", String(Math.random()))
  ];
}

function eslintTask()
{
  return this.src(["*.js", "*.json", "ui/**/*.js", "ui/**/*.vue", "lib/**/*.js",
                   "contentScript/**/*.js",
                   "locale/**/*.json", "!ui/third-party/**"])
             .pipe(eslint);
}

function htmlValidateTask()
{
  return this.src(["ui/**/*.html", "ui/**/*.vue", "ui/**/*.vue"])
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
            if (/[/\\](vue|clipboard|recoveryCodes)\.js$|[/\\]ui[/\\]components[/\\]/.test(id))
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
    this.src("lib/background.js")
        .pipe(rollup, ...rollupOptions(this))
        .rename("background.js")
  ];
});

let chromeMain = series(common, function(common)
{
  return [
    common,
    this.src("manifest.json")
        .pipe(utils.jsonModify, data =>
        {
          delete data.applications;
        })
  ];
});

export let chrome = series(chromeMain, addReloader, files => files.dest("build-chrome"));

export let crx = series(chromeMain, function(files)
{
  return files.pipe(zip, `pfp-${VERSION}.zip`).dest("build-chrome");
});

export let watchChrome = series(chrome, function()
{
  return this.src(["*.js", "*.json", "ui/**/*", "lib/**/*", "contentScript/**/*", "locale/**/*"])
             .watch(chrome);
});

let firefoxMain = series(common, function(common)
{
  return [
    common,
    this.src("manifest.json")
        .pipe(utils.jsonModify, data =>
        {
          delete data.minimum_chrome_version;
          delete data.minimum_opera_version;
          delete data.background.persistent;

          data.browser_action.browser_style = false;
        })
  ];
});

export let firefox = series(firefoxMain, addReloader, files => files.dest("build-firefox"));

export let xpi = series(firefoxMain, function(files)
{
  return files.pipe(zip, `pfp-${VERSION}.xpi`).dest("build-firefox");
});

export let watchFirefox = series(firefox, function()
{
  return this.src(["*.js", "*.json", "ui/**/*", "lib/**/*", "contentScript/**/*", "locale/**/*"])
             .watch(firefox);
});

export function clean()
{
  return this.src(["build-chrome/**", "build-firefox/**"])
             .rm();
}

export let all = parallel(firefox, xpi, chrome, crx);
export default all;
