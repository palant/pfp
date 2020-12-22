/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {changePassword} from "../lib/masterPassword.js";
import {addStored} from "../lib/passwords.js";
import {getCode, isValid, decodeCode} from "../lib/recoveryCodes.js";
import {
  enableFakeEncryption, disableFakeEncryption, enableFakeRandom,
  disableFakeRandom
} from "../test-env/fake-crypto.js";

describe("recoveryCodes.js", () =>
{
  before(() =>
  {
    disableFakeEncryption();
    enableFakeRandom(2);
  });

  after(() =>
  {
    enableFakeEncryption();
    disableFakeRandom();
  });

  it("should produce usable recovery codes", async function()
  {
    const dummyMaster = "foobar";
    const stored = {
      site: "example.com",
      name: "foo",
      password: "bar"
    };

    await changePassword(dummyMaster);
    await addStored(stored);

    let code = await getCode(stored);
    let lines = code.trim().split(/[\r\n]+/);
    expect(lines[0].length).to.equal(lines[lines.length - 1].length);

    expect(isValid(code)).to.equal("ok");
    expect(isValid(lines[0])).to.equal("unterminated");
    expect(isValid(lines[lines.length - 1])).to.equal("checksum_mismatch");
    expect(isValid(lines.slice(0, -1).join("\n"))).to.equal("unterminated");
    expect(isValid(lines.slice(0, -2).concat([lines[lines.length - 1], lines[lines.length - 2]]).join("\n"))).to.equal("checksum_mismatch");
    expect(isValid(code.substr(10, 10) + code.substr(0, 10) + code.substr(20))).to.equal("checksum_mismatch");

    expect(await decodeCode(code)).to.equal(stored.password);
  });
});
