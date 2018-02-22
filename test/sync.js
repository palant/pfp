/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let sync = require("../lib/sync");
let masterPassword = require("../lib/masterPassword");
let storage = require("../lib/storage");
let provider = require("../test-lib/sync-providers/dropbox");

let dummyMaster = "foobar";

function unexpectedError(error)
{
  this.ok(false, "Unexpected error: " + error);
  console.error(error);
}

function done()
{
  this.done();
}

function getLocalData()
{
  let {storageData} = require("../test-lib/browserAPI");
  let filteredData = {};
  for (let key of Object.keys(storageData))
    if (key.startsWith("site:"))
      filteredData[key] = storageData[key];
  return filteredData;
}

function checkSyncError(test)
{
  if (sync.syncData && sync.syncData.error)
    test.ok(false, `Unexpected error: ${sync.syncData.error}`);
}

exports.setUp = function(callback)
{
  let {storageData: storage} = require("../test-lib/browserAPI");
  for (let key of Object.keys(storage))
    delete storage[key];

  masterPassword.forgetPassword();

  provider._reset();

  callback();
};

exports.tearDown = function(callback)
{
  sync.disable().then(() => callback());
};

exports.testAuthorizeAndDisable = function(test)
{
  Promise.resolve().then(() =>
  {
    test.ok(!sync.syncData, "Sync not set up initially");
    return sync.authorize("dropbox");
  }).then(() =>
  {
    test.ok(sync.syncData, "Sync set up after authorization");
    test.equal(sync.syncData.provider, "dropbox", "Sync provider");
    return sync.disable();
  }).then(() =>
  {
    test.ok(!sync.syncData, "Sync not set up after disabling");
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testMerge = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return masterPassword.forgetPassword();
  }).then(() =>
  {
    return sync.authorize("dropbox");
  }).then(() =>
  {
    return Promise.all([
      storage.get("salt", null),
      storage.get("hmac-secret", null),
      sync.sync()
    ]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 1, "Revision after initial sync");

    test.deepEqual(JSON.parse(contents), {
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac
      }
    }, "Remote contents after initial sync");

    return sync.sync();
  }).then(() =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 1, "No revision change without changes");
    return Promise.all([
      storage.set("site:foo", "bar", null),
      storage.set("site:foo:blubber", "blabber", null)
    ]);
  }).then(() =>
  {
    return Promise.all([
      storage.get("salt", null),
      storage.get("hmac-secret", null),
      sync.sync()
    ]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 2, "Revision after local-only update");

    test.deepEqual(JSON.parse(contents), {
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "bar",
        "site:foo:blubber": "blabber"
      }
    }, "Remote contents after local-only update");

    provider._set("/passwords.json", 3, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "bas",
        "site:example.com:blub": "blab"
      }
    }));
    return Promise.all([salt, hmac, sync.sync()]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 3, "No revision change after remote-only update");

    test.deepEqual(getLocalData(), {
      "site:foo": "bas",
      "site:example.com:blub": "blab"
    }, "Local contents after remote-only update");

    provider._set("/passwords.json", 4, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "bar",
        "site:foo:x": "y"
      }
    }));

    return Promise.all([
      storage.set("site:foo", "foo", null),
      storage.set("site:example.com:blub", "blub", null)
    ]);
  }).then(() =>
  {
    return Promise.all([
      storage.get("salt", null),
      storage.get("hmac-secret", null),
      sync.sync()
    ]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 5, "Revision after conflict resolution");

    test.deepEqual(JSON.parse(contents), {
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "foo",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    }, "Remote contents after conflict resolution");

    test.deepEqual(getLocalData(), {
      "site:foo": "foo",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    }, "Local contents after conflict resolution");

    provider._set("/passwords.json", 6, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo:blubber": "blabber",
        "site:example.com:blub": "blab"
      }
    }));
    return sync.disable();
  }).then(() =>
  {
    return sync.authorize("dropbox");
  }).then(() =>
  {
    return Promise.all([
      storage.get("salt", null),
      storage.get("hmac-secret", null),
      sync.sync()
    ]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 7, "Revision after reconnecting client");

    test.deepEqual(JSON.parse(contents), {
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "foo",
        "site:foo:blubber": "blabber",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    }, "Remote contents after reconnecting client");

    test.deepEqual(getLocalData(), {
      "site:foo": "foo",
      "site:foo:blubber": "blabber",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    }, "Local contents after reconnecting client");

    provider._set("/passwords.json", 8, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac,
        "site:foo": "foo",
        "site:foo:x": "y",
        "site:example.com:blub": "blub"
      }
    }));

    return Promise.all([salt, hmac, sync.sync()]);
  }).then(([salt, hmac, _]) =>
  {
    checkSyncError(test);

    let {revision, contents} = provider._get("/passwords.json");
    test.equal(revision, 8, "No revision change after remote removal of a previously synced key");

    test.deepEqual(getLocalData(), {
      "site:foo": "foo",
      "site:foo:x": "y",
      "site:example.com:blub": "blub"
    }, "Local contents after remote removal of a previously synced key");
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testErrors = function(test)
{
  return Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return masterPassword.forgetPassword();
  }).then(() =>
  {
    return sync.authorize("dropbox");
  }).then(() =>
  {
    return sync.sync();
  }).then(() =>
  {
    test.ok(!sync.syncData.error, "No error after initial sync");
    return storage.set("site:foo", "bar", null);
  }).then(() =>
  {
    sync.syncData.token += "0";
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-invalid-token", "Attempting to sync with an invalid token");
    sync.syncData.token = sync.syncData.token.slice(0, -1);

    provider._set("/passwords.json", 2, "invalid JSON");
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with invalid JSON");

    provider._set("/passwords.json", 3, JSON.stringify(null));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with null data");

    provider._set("/passwords.json", 4, JSON.stringify(123));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with non-object");

    provider._set("/passwords.json", 5, JSON.stringify({}));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with empty object");

    provider._set("/passwords.json", 6, JSON.stringify({
      application: "foobar",
      format: 2
    }));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with unknown application's data");

    provider._set("/passwords.json", 7, JSON.stringify({
      application: "pfp",
      format: 321
    }));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with unknown format version");

    provider._set("/passwords.json", 8, JSON.stringify({
      application: "pfp",
      format: 2,
      data: null
    }));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with null data");

    provider._set("/passwords.json", 9, JSON.stringify({
      application: "pfp",
      format: 2,
      data: 456
    }));
    return sync.sync();
  }).then(() =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with non-object data");

    provider._set("/passwords.json", 9, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {}
    }));
    return Promise.all([
      storage.get("salt", null),
      storage.get("hmac-secret", null),
      sync.sync()
    ]);
  }).then(([salt, hmac, _]) =>
  {
    test.equal(sync.syncData.error, "sync-unknown-data-format", "Attempting to sync with empty data");

    provider._set("/passwords.json", 8, JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt,
        "hmac-secret": hmac
      }
    }));
    return sync.sync();
  }).then(() =>
  {
    test.ok(!sync.syncData.error, "Error reset after successful sync");
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};
