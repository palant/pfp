/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

export default function()
{
  let chunkNames = {};

  return {
    name: "iife-chunks",

    renderChunk(code, chunk, options)
    {
      if (chunk.isEntry)
      {
        code = code.replace(/import\s*{(.*?)}\s*from\s*['"].\/(.*?)['"];/g, (match, imported, chunkFile) =>
        {
          imported = imported.replace(/ as /g, ":");
          return `const{${imported}}=${chunkNames[chunkFile]};`;
        });
        return code;
      }
      else
      {
        chunkNames[chunk.fileName] = chunk.name;
        code = code.replace(/export\s*{(.*?)};/g, (match, exported) =>
        {
          exported = exported.replace(/([\w$]+)\s+as\s+([\w$]+)/g, "$2:$1");
          return `return {${exported}};`;
        });
        return `const ${chunk.name}=function(){${code}}();`;
      }
    }
  };
}
