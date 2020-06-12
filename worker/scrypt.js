/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const N = 32768;
const r = 8;
const p = 1;

import scryptModule from "@stablelib/scrypt";
const {Scrypt} = scryptModule;

const hasher = new Scrypt(N, r, p);

function scrypt(password, salt, length)
{
  return hasher.deriveKey(password, salt, length);
}

const _self = self;
_self.onmessage = function({data: {jobId, password, salt, length}})
{
  _self.postMessage({
    jobId,
    result: hasher.deriveKey(password, salt, length)
  });
};
