/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {
  addGenerated, addStored, addAlias, getAllPasswords
} from "../lib/passwords.js";
import {
  getMasterPassword, changePassword, forgetPassword, checkPassword, getState
} from "../lib/masterPassword.js";
import {storageData} from "../test-env/browserAPI.js";

describe("masterPassword.js", () =>
{
  let dummyMaster = "foobar";

  afterEach(() =>
  {
    for (let key of Object.keys(storageData))
      delete storageData[key];

    forgetPassword();
  });

  it("should only give out master password when unlocked", async function()
  {
    try
    {
      await getMasterPassword();
      expect.fail("Returned master password when locked");
    }
    catch (e)
    {
      expect(e).to.equal("master_password_required");
    }

    await changePassword(dummyMaster);
    expect(await getMasterPassword()).to.equal(dummyMaster);

    await forgetPassword();
    try
    {
      await getMasterPassword();
      expect.fail("Returned master password when locked");
    }
    catch (e)
    {
      expect(e).to.equal("master_password_required");
    }

    await forgetPassword();
    await checkPassword(dummyMaster);
    expect(await getMasterPassword()).to.equal(dummyMaster);
  });

  it("should accept only the correct master password", async function()
  {
    try
    {
      await checkPassword(dummyMaster);
      expect.fail("Accepted master password when none is set");
    }
    catch (e)
    {
      expect(e).to.equal("declined");
    }

    await changePassword(dummyMaster);
    await checkPassword(dummyMaster);

    try
    {
      await checkPassword(dummyMaster + dummyMaster);
      expect.fail("Accepted wrong master password");
    }
    catch (e)
    {
      expect(e).to.equal("declined");
    }
  });

  it("should report correct state", async function()
  {
    expect(await getState()).to.equal("unset");

    await changePassword(dummyMaster);
    expect(await getState()).to.equal("known");

    await forgetPassword();
    expect(await getState()).to.equal("set");

    await checkPassword(dummyMaster);
    expect(await getState()).to.equal("known");
  });

  it("should clear all data on master password change", async function()
  {
    function addData()
    {
      return Promise.all([
        addGenerated({
          site: "example.com",
          name: "foo",
          length: 8,
          lower: true,
          upper: false,
          number: true,
          symbol: false
        }),
        addStored({
          site: "example.info",
          name: "bar",
          password: "foo"
        }),
        addAlias("sub.example.info", "example.com")
      ]);
    }

    await changePassword(dummyMaster);
    await addData();
    await changePassword(dummyMaster);
    expect(await getAllPasswords()).to.deep.equal({});

    await addData();
    await changePassword(dummyMaster + dummyMaster);
    expect(await getAllPasswords()).to.deep.equal({});
  });
});
