/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const N = 32768;
const r = 8;
const p = 1;

let {toTypedArray} = require("../lib/typedArrayConversion");
let {Scrypt} = require("@stablelib/scrypt");
let hasher = new Scrypt(N, r, p);

module.exports = hasher;

if (typeof self != "undefined")
{
  self.onmessage = function({data: {jobId, password, salt, length}})
  {
    self.postMessage({
      jobId,
      result: hasher.deriveKey(toTypedArray(password), toTypedArray(salt), length)
    });
  };
}
