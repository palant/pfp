/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let gulp = require("gulp");
let less = require("gulp-less");
let del = require("del");
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
    let ps = spawn("./node_modules/.bin/jpm", args);
    ps.stdout.pipe(process.stdout);
    ps.stderr.pipe(process.stderr);
    ps.on("close", resolve);
  });
}

gulp.task("default", ["xpi"], function()
{
});

gulp.task("less", function()
{
  return gulp.src("data/**/*.less")
             .pipe(less())
             .pipe(gulp.dest('data'));
});

gulp.task("xpi", ["less"], function()
{
  return jpm(["xpi"]);
});

gulp.task("post", ["less"], function()
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
  return del("data/**/*.css");
});
