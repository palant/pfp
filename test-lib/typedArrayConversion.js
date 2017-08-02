/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

exports.toTypedArray = function(obj)
{
  // Unit tests will send array buffers as "objects"
  let length = 0;
  while (obj.hasOwnProperty(length))
    length++;

  let array = new Uint8Array(length);
  for (let i = 0; i < length; i++)
    array[i] = obj[i];
  return array;
};
