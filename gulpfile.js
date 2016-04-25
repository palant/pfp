/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let gulp = require("gulp");
let less = require("gulp-less");
let rename = require("gulp-rename");
let del = require("del");
let path = require("path");
let spawn = require("child_process").spawn;

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
    let builddir = path.resolve(process.cwd(), "build");
    let jpm = path.resolve(process.cwd(), "node_modules/.bin/jpm");
    let ps = spawn(jpm, args, {cwd: builddir});
    ps.stdout.pipe(process.stdout);
    ps.stderr.pipe(process.stderr);
    ps.on("close", resolve);
  });
}

gulp.task("default", ["xpi"], function()
{
});

gulp.task("package.json", function()
{
  return gulp.src("package.json")
             .pipe(gulp.dest("build"));
});

gulp.task("LICENSE.txt", function()
{
  return gulp.src("LICENSE.txt")
             .pipe(gulp.dest("build"));
});

gulp.task("icon.png", function()
{
  return gulp.src(["data/images/icon48.png"])
             .pipe(rename("icon.png"))
             .pipe(gulp.dest("build"));
});

gulp.task("icon64.png", function()
{
  return gulp.src(["data/images/icon64.png"])
             .pipe(gulp.dest("build"));
});

gulp.task("data", function()
{
  return gulp.src(["data/**/*.js", "data/**/*.html", "data/**/*.png", "data/**/*.svg", "!data/images/icon48.png"])
             .pipe(gulp.dest("build/data"));
});

gulp.task("less", function()
{
  return gulp.src("data/**/*.less")
             .pipe(less())
             .pipe(gulp.dest("build/data"));
});

gulp.task("lib", function()
{
  return gulp.src("lib/**/*.js")
             .pipe(gulp.dest("build/lib"));
});

gulp.task("locale", function()
{
  return gulp.src("locale/**/*.properties")
             .pipe(gulp.dest("build/locale"));
});

gulp.task("builddir", ["package.json", "LICENSE.txt", "icon.png", "icon64.png", "data", "less", "lib", "locale"], function()
{
});

gulp.task("xpi", ["builddir"], function()
{
  return jpm(["xpi"]);
});

gulp.task("post", ["builddir"], function()
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

gulp.task("clean", function()
{
  return del("build");
});
