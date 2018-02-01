/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const path = require("path");

const MemoryFS = require("memory-fs");
const {webpack} = require("webpack2-stream-watch");

module.exports = function(source)
{
  let fs = new MemoryFS();
  let filename = path.basename(this.resourcePath);

  let compiler = webpack({
    entry: this.resourcePath,
    output: {
      filename,
      path: "/",
      pathinfo: true
    },
    resolve: {
      modules: [path.resolve(__dirname, "third-party")]
    }
  });
  compiler.outputFileSystem = fs;

  let callback = this.async();
  compiler.run((err, stats) =>
  {
    if (err)
      callback(err);
    else if (stats.hasErrors())
      callback(stats.toJson().errors);
    else
    {
      let data = fs.readFileSync("/" + filename, "utf-8");
      callback(null, "module.exports = " + JSON.stringify(data) + ";");
    }
  });
};
