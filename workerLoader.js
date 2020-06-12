/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {rollup} from "rollup";

export default function(regexp)
{
  return {
    name: "worker-loader",
    buildStart(options)
    {
      this._plugins = options.plugins;
    },
    load: async function(id)
    {
      if (!regexp.test(id))
        return null;

      let bundle = await rollup({
        input: id,
        plugins: this._plugins.filter(p => p.name != "worker-loader")
      });

      let {output} = await bundle.generate({
        name: "worker",
        format: "cjs",
        compact: true
      });
      if (output.length != 1 || !output[0].code)
        throw new Error("Unexpected rollup output");

      return "export default function(){" + output[0].code + "}";
    }
  };
}
