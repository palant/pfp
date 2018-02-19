/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let storage = require("./storage");
let {lock, STORAGE_PREFIX: passwordsPrefix} = require("./passwords");

const dataKey = "syncData";

function isKeyIncluded(key)
{
  return key.startsWith(passwordsPrefix);
}

let tracker = {
  enabled: false,
  prefix: "sync:",

  onModified(key)
  {
    if (!isKeyIncluded(key))
      return;

    lock.acquire().then(() =>
    {
      return storage.set(this.prefix + key, true, null);
    }).finally(() => lock.release());
  },

  enable(startUp)
  {
    if (this.enabled)
      return Promise.resolve();

    this.enabled = true;
    let waitFor;
    if (startUp)
    {
      storage.addModificationListener(this.onModified);
      return Promise.resolve();
    }
    else
    {
      return storage.getAllByPrefix(passwordsPrefix, null).then(items =>
      {
        storage.addModificationListener(this.onModified);
        let actions = [];
        for (let key in items)
          actions.push(storage.set(this.prefix + key, true, null));
        return Promise.all(actions);
      });
    }
  },

  disable()
  {
    if (!this.enabled)
      return Promise.resolve();

    storage.removeModificationListener(this.onModified);
    this.enabled = false;
    return storage.deleteByPrefix(this.prefix);
  }
};
tracker.onModified = tracker.onModified.bind(tracker);

let syncData = null;
storage.get(dataKey, null).then(value =>
{
  syncData = value;
  if (syncData)
    tracker.enable(true);
});

Object.defineProperty(exports, "provider", {
  enumerable: true,
  get: () => syncData ? syncData.provider : null
});

exports.authorize = function()
{
  let provider = require("./sync-providers/dropbox");
  return provider.authorize().then(token =>
  {
    return lock.acquire().then(() =>
    {
      syncData = {provider: "dropbox", token};
      return Promise.all([
        storage.set(dataKey, syncData, null),
        tracker.enable()
      ]);
    }).finally(() => lock.release());
  });
};

exports.disable = function()
{
  return lock.acquire().then(() =>
  {
    syncData = null;
    return Promise.all([
      storage.delete(dataKey),
      tracker.disable()
    ]);
  }).finally(() => lock.release());
};
