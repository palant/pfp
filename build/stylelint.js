/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import stylelint from "stylelint";

import {MemoryFile} from "builder";

export default async function* stylelint_(files, options = {})
{
  options = Object.assign({formatter: "string"}, options);

  let seenErrors = false;
  for await (let file of files)
  {
    file = await file.read();
    options = Object.assign({}, options, {
      code: file.contents,
      codeFilename: file.path
    });

    let result = await stylelint.lint(options);
    if (options.fix && result.code)
      yield new MemoryFile(file.path, result.code);
    else
    {
      yield file;
      if (result.report)
        console.log(result.report);
    }
    if (result.errored)
      seenErrors = true;
  }

  if (seenErrors)
    throw null;
}
