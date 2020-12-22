/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {generateRandom} from "../lib/crypto.js";
import {
  changePassword, checkPassword, forgetPassword
} from "../lib/masterPassword.js";
import {
  addGenerated, addStored, addAlias, getAllPasswords
} from "../lib/passwords.js";
import storage, {encrypt} from "../lib/storage.js";
import {
  setDropboxProvider, getSyncData, disableSync, authorize, sync
} from "../lib/sync.js";
import {storageData} from "../test-env/browserAPI.js";
import provider from "../test-env/fake-storage-provider.js";

let dummyMaster = "foobar";

describe("sync.js", () =>
{
  let origProvider;
  before(() =>
  {
    origProvider = setDropboxProvider(provider);
  });

  after(() =>
  {
    setDropboxProvider(origProvider);
  });

  afterEach(async function()
  {
    for (let key of Object.keys(storageData))
      delete storageData[key];

    forgetPassword();

    await disableSync();
    provider._reset();
  });

  function getLocalData()
  {
    let filteredData = {};
    for (let key of Object.keys(storageData))
      if (key.startsWith("site:"))
        filteredData[key] = storageData[key];
    return filteredData;
  }

  function checkSyncError()
  {
    let syncData = getSyncData();
    if (syncData)
      expect(syncData.error).to.be.undefined;
  }

  function sign(data)
  {
    let ciphertext = atob(data.data["sync-secret"].split("_")[1]);
    let secret = atob(JSON.parse(crypto.subtle._fakeDecrypt(ciphertext)));

    let values = [data.revision];
    let keys = Object.keys(data.data);
    keys.sort();
    for (let key of keys)
      values.push([key, data.data[key]]);
    data.signature = btoa("HMAC!" + secret + "!" + JSON.stringify(values));
    return data;
  }

  it("should be set up after authorization", async function()
  {
    expect(getSyncData()).to.deep.equal({});

    await authorize("dropbox");
    expect(getSyncData()).not.to.deep.equal({});
    expect(getSyncData().provider).to.equal("dropbox");

    await disableSync();
    expect(getSyncData()).to.deep.equal({});
  });

  it("should merge concurrent changes", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    checkSyncError();

    let salt = await storage.get("salt", null);
    let hmac = await storage.get("hmac-secret", null);
    let secret = await storage.get("sync-secret", null);
    await forgetPassword();

    let {revision, contents} = provider._get("/passwords.json");
    expect(revision).to.equal("1");

    let parsed = JSON.parse(contents);
    expect(parsed).to.deep.equal(sign({
      application: "pfp",
      format: 3,
      revision: 1,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    }));

    // No data change
    parsed.format = 2;
    provider._get("/passwords.json").contents = JSON.stringify(parsed);

    await sync();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("1");

    // Local-only change
    await storage.set("site:foo", "bar", null);
    await storage.set("site:foo:blubber", "blabber", null);

    await sync();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("2");

    expect(JSON.parse(contents)).to.deep.equal(sign({
      application: "pfp",
      format: 3,
      revision: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "bar",
        "site:foo:blubber": "blabber"
      }
    }));

    // Remote-only change
    provider._set("/passwords.json", "3", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 8,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "bas",
        "site:example.com:blub": "blab"
      }
    })));

    await sync();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("3");

    expect(getLocalData()).to.deep.equal({
      "site:foo": "bas",
      "site:example.com:blub": "blab"
    });

    // Parallel local and remote changes (conflict resolution)
    provider._set("/passwords.json", "4", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 9,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "bar",
        "site:foo:x": "y"
      }
    })));

    await storage.set("site:foo", "foo", null);
    await storage.set("site:example.com:blub", "blub", null);

    await sync();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("5");

    expect(JSON.parse(contents)).to.deep.equal(sign({
      application: "pfp",
      format: 3,
      revision: 10,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "foo",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    }));

    expect(getLocalData()).to.deep.equal({
      "site:foo": "foo",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    });

    // Reconnecting the client after remote changes
    provider._set("/passwords.json", "6", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 14,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo:blubber": "blabber",
        "site:example.com:blub": "blab"
      }
    })));

    await disableSync();
    await checkPassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    await forgetPassword();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("7");

    expect(JSON.parse(contents)).to.deep.equal(sign({
      application: "pfp",
      format: 3,
      revision: 15,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "foo",
        "site:foo:blubber": "blabber",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    }));

    expect(getLocalData()).to.deep.equal({
      "site:foo": "foo",
      "site:foo:blubber": "blabber",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    });

    // Remote-only key removal
    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 18,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "foo",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    })));

    await sync();
    checkSyncError();

    ({revision, contents} = provider._get("/passwords.json"));
    expect(revision).to.equal("8");

    expect(getLocalData()).to.deep.equal({
      "site:foo": "foo",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    });
  });

  it("should recognize attempts to replace an unrelated backup", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    checkSyncError();

    let salt = await storage.get("salt", null);
    let hmac = await storage.get("hmac-secret", null);
    let secret = await storage.get("sync-secret", null);

    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 20,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "foo",
      }
    })));

    await sync();
    checkSyncError();

    expect(getLocalData()).to.deep.equal({
      "site:foo": "foo"
    });

    secret = await encrypt(generateRandom(32));
    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "bar",
        "site:bar": "foo"
      }
    })));

    await sync();
    expect(getSyncData().error).to.equal("sync_unrelated_client");

    await disableSync();
    await authorize("dropbox");
    await sync();
    checkSyncError();

    expect(getLocalData()).to.deep.equal({
      "site:foo": "foo",
      "site:bar": "foo"
    });

    let parsed = JSON.parse(provider._get("/passwords.json").contents);
    expect(parsed).to.deep.equal(sign({
      application: "pfp",
      format: 3,
      revision: 3,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret,
        "site:foo": "foo",
        "site:bar": "foo"
      }
    }));
  });

  it("should produce expected error codes for error conditions", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    expect(getSyncData().error).to.be.undefined;

    await forgetPassword();
    await storage.set("site:foo", "bar", null);

    getSyncData().token += "0";
    await sync();
    expect(getSyncData().error).to.equal("sync_invalid_token");
    getSyncData().token = getSyncData().token.slice(0, -1);

    provider._set("/passwords.json", "2", "invalid JSON");
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "3", JSON.stringify(null));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "4", JSON.stringify(123));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "5", JSON.stringify({}));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "6", JSON.stringify({
      application: "foobar",
      format: 3
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "7", JSON.stringify({
      application: "pfp",
      format: 321
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "8", JSON.stringify({
      application: "pfp",
      format: 3,
      data: null
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "9", JSON.stringify({
      application: "pfp",
      format: 3,
      data: 456
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "9", JSON.stringify({
      application: "pfp",
      format: 3,
      data: {}
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    let salt = await storage.get("salt", null);
    let hmac = await storage.get("hmac-secret", null);
    let secret = await storage.get("sync-secret", null);
    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    })));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "8", JSON.stringify({
      application: "pfp",
      format: 3,
      revision: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "8", JSON.stringify({
      application: "pfp",
      format: 3,
      revision: 2,
      signature: "invalid",
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": "unrelated"
      }
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unrelated_client");

    provider._set("/passwords.json", "8", JSON.stringify({
      application: "pfp",
      format: 3,
      revision: 2,
      signature: "invalid",
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_tampered_data");

    provider._set("/passwords.json", "8", JSON.stringify({
      application: "pfp",
      format: 3,
      revision: 2,
      signature: 123,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    }));
    await sync();
    expect(getSyncData().error).to.equal("sync_unknown_data_format");

    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 0.5,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    })));
    await sync();
    expect(getSyncData().error).to.equal("sync_tampered_data");

    provider._set("/passwords.json", "8", JSON.stringify(sign({
      application: "pfp",
      format: 3,
      revision: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "sync-secret": secret
      }
    })));
    await sync();
    expect(getSyncData().error).to.be.undefined;
  });

  it("should deal with concurrent uploads by other clients", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    expect(getSyncData().error).to.be.undefined;

    await forgetPassword();
    await storage.set("site:foo", "bar", null);

    provider.changeRevisionOnGet = 1;
    await sync();
    expect(getSyncData().error).to.be.undefined;

    let {revision, contents} = provider._get("/passwords.json");
    expect(JSON.parse(contents).data["site:foo"]).to.equal("bar");

    await storage.delete("site:foo");

    provider.changeRevisionOnGet = 10;
    await sync();
    expect(getSyncData().error).to.equal("sync_too_many_retries");

    ({revision, contents} = provider._get("/passwords.json"));
    expect(JSON.parse(contents).data["site:foo"]).to.equal("bar");
  });

  it("should allow syncs to data with a different HMAC secret", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();

    let salt = JSON.parse(provider._get("/passwords.json").contents).data.salt;
    await changePassword(dummyMaster);

    await addGenerated({
      site: "example.com",
      name: "foo",
      length: 8,
      lower: true,
      upper: false,
      number: true,
      symbol: false
    });
    await addGenerated({
      site: "example.info",
      name: "bar",
      length: 16,
      lower: false,
      upper: true,
      number: false,
      symbol: true
    });
    await addStored({
      site: "example.com",
      name: "foo",
      revision: 2,
      password: "bar"
    });
    await addAlias("example.net", "example.com");

    await authorize("dropbox");
    await sync();
    expect(getSyncData().error).to.be.undefined;

    expect(await storage.get("salt", null)).to.equal(salt);
    expect(await getAllPasswords()).to.deep.equal({
      "example.com": {
        site: "example.com",
        passwords: [
          {
            type: "generated2",
            site: "example.com",
            name: "foo",
            length: 8,
            lower: true,
            upper: false,
            number: true,
            symbol: false
          },
          {
            type: "stored",
            site: "example.com",
            name: "foo",
            revision: 2,
            password: "bar"
          }
        ],
        aliases: ["example.net"]
      },
      "example.info": {
        site: "example.info",
        passwords: [
          {
            type: "generated2",
            site: "example.info",
            name: "bar",
            length: 16,
            lower: false,
            upper: true,
            number: false,
            symbol: true
          }
        ],
        aliases: []
      }
    });

    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    expect(getSyncData().error).to.be.undefined;

    expect(await storage.get("salt", null)).to.equal(salt);
    expect(await getAllPasswords()).to.deep.equal({
      "example.com": {
        site: "example.com",
        passwords: [
          {
            type: "generated2",
            site: "example.com",
            name: "foo",
            length: 8,
            lower: true,
            upper: false,
            number: true,
            symbol: false
          },
          {
            type: "stored",
            site: "example.com",
            name: "foo",
            revision: 2,
            password: "bar"
          }
        ],
        aliases: ["example.net"]
      },
      "example.info": {
        site: "example.info",
        passwords: [
          {
            type: "generated2",
            site: "example.info",
            name: "bar",
            length: 16,
            lower: false,
            upper: true,
            number: false,
            symbol: true
          }
        ],
        aliases: []
      }
    });
  });

  it("should disable on master password changes", async function()
  {
    await changePassword(dummyMaster);
    await authorize("dropbox");
    await sync();
    expect(getSyncData().error).to.be.undefined;

    await changePassword(dummyMaster + dummyMaster);
    expect(getSyncData()).to.deep.equal({});
  });
});
