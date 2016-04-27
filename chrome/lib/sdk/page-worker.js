/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

exports.Page = function(options)
{
  let result = Object.create(exports.Page.prototype);
  result.frame = document.createElement("iframe");
  document.body.appendChild(result.frame);

  result.frame.src = options.contentURL;
  return result;
};
