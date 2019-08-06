/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const rollup = require("rollup");

module.exports = function(regexp)
{
  return {
    name: "worker-loader",
    buildStart(options)
    {
      this._plugins = options.plugins;
    },
    load(id)
    {
      if (!regexp.test(id))
        return null;

      return rollup.rollup({
        input: id,
        plugins: this._plugins.filter(p => p.name != "worker-loader")
      }).then(bundle =>
      {
        return bundle.generate({
          name: "worker",
          format: "cjs",
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
