/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const path = require("path");

const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const commonjs = require("rollup-plugin-commonjs");
const resolve = require("rollup-plugin-node-resolve");

module.exports = function(regexp)
{
  return {
    name: "worker-loader",
    resolveId(id)
    {
      if (!regexp.test(id))
        return null;
      return id;
    },
    load(id)
    {
      if (!regexp.test(id))
        return null;

      return rollup.rollup({
        input: id.replace(/^\.\.\//, ""),
        plugins: [resolve(), commonjs(), babel({
          babelrc: false,
          presets: ["@babel/preset-env"]
        })]
      }).then(bundle =>
      {
        return bundle.generate({
          name: "worker",
          format: "iife",
          compact: true
        });
      }).then(({output}) =>
      {
        if (output.length != 1 || !output[0].code)
          throw new Error("Unexpected rollup output");

        return "export default " + JSON.stringify(output[0].code.replace(/\n\s+/g, "\n"));
      });
    }
  };
};
