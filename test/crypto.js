/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {crypto} = require("../build-test/lib");

exports.testBase32 = function(test)
{
  function doTest(hex, encoded)
  {
    let binary = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2)
      binary[i / 2] = parseInt(hex.substr(i, 2), 16);

    test.equal(crypto.toBase32(binary), encoded, `Encoding ${hex}`);
    test.deepEqual(crypto.fromBase32(encoded), binary, `Decoding ${encoded}`);
  }

  doTest("0000000000", "AAAAAAAA");
  doTest("0842108421", "BBBBBBBB");
  doTest("ffffffffff", "99999999");
  doTest("0000000000ffffffffff", "AAAAAAAA99999999");
  doTest("00443214C74254B635CF84653A56D7C675BE77DF", "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");

  test.done();
};
