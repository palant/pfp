/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {importHmacSecret, getDigest, generateRandom} from "./crypto.js";
import {EventTarget, emit} from "./eventTarget.js";
import {locked} from "./lock.js";
import masterPassword, {
  deriveKeyWithPassword, rekey
} from "./masterPassword.js";
import {
  exportPasswordData, STORAGE_PREFIX as passwordsPrefix
} from "./passwords.js";
import storage, {saltKey, hmacSecretKey, decrypt} from "./storage.js";
import * as _dropboxProvider from "./sync-providers/dropbox.js";
import * as gdriveProvider from "./sync-providers/gdrive.js";
import * as remotestorageProvider from "./sync-providers/remotestorage.js";

// Make a mutable copy for the unit tests
let dropboxProvider = _dropboxProvider;
export function setDropboxProvider(provider)
{
  let orig = dropboxProvider;
  dropboxProvider = provider;
  return orig;
}

const MAX_RETRIES = 5;

const MILLIS_IN_SECOND = 1000;
const MILLIS_IN_MINUTE = 60 * MILLIS_IN_SECOND;
const MILLIS_IN_HOUR = 60 * MILLIS_IN_MINUTE;

const events = EventTarget();
export default events;

function getProvider(provider)
{
  if (provider == "dropbox")
    return dropboxProvider;
  else if (provider == "gdrive")
    return gdriveProvider;
  else if (provider == "remotestorage")
    return remotestorageProvider;
  else
    throw new Error("Unknown sync provider");
}

let tracker = {
  enabled: false,
  prefix: "sync:",
  override: false,

  onModified: async function(key)
  {
    if (this.override || !key.startsWith(passwordsPrefix))
      return;

    await storage.set(this.prefix + key, true, null);
  },

  enable: async function(startUp)
  {
    if (this.enabled)
      return;

    this.enabled = true;
    if (startUp)
    {
      storage.on("set", this.onModified);
      storage.on("delete", this.onModified);
    }
    else
    {
      let items = await storage.getAllByPrefix(passwordsPrefix, null);
      storage.on("set", this.onModified);
      storage.on("delete", this.onModified);
      let actions = Object.keys(items).map(key => storage.set(this.prefix + key, true, null));
      await Promise.all(actions);
    }
  },

  disable: async function()
  {
    if (!this.enabled)
      return;

    storage.off("set", this.onModified);
    storage.off("delete", this.onModified);
    await this.clearModifiedKeys();

    this.enabled = false;
  },

  getModifiedKeys: async function()
  {
    let items = await storage.getAllByPrefix(this.prefix, null);
    return new Set(Object.keys(items).map(key => key.substr(this.prefix.length)));
  },

  clearModifiedKeys: async function()
  {
    await storage.deleteByPrefix(this.prefix);
  }
};
tracker.onModified = tracker.onModified.bind(tracker);

let engine = {
  storageKey: "syncData",
  secretKey: "sync-secret",
  checkInterval: 10 * MILLIS_IN_MINUTE,
  syncInterval: MILLIS_IN_HOUR,
  data: null,
  currentSync: null,
  _timeout: null,

  init: async function()
  {
    this.data = await storage.get(this.storageKey, null);
    if (this.data)
    {
      tracker.enable(true);
      this._start();
    }
    await emit(events, "dataModified");
  },

  _start()
  {
    this._stop();

    this._timeout = setInterval(this._check, this.checkInterval);
    this._check();
  },

  _stop()
  {
    if (this._timeout !== null)
      clearTimeout(this._timeout);
    this._timeout = null;
  },

  _check()
  {
    let now = Date.now();
    if (!this.data.lastSync || this.data.lastSync > now || now - this.data.lastSync >= this.syncInterval)
      this.sync();
  },

  _rekey: async function(data)
  {
    let decryptionKey = await deriveKeyWithPassword(data[saltKey]);
    let hmacSecret;
    try
    {
      hmacSecret = await decrypt(data[hmacSecretKey], decryptionKey);
    }
    catch (error)
    {
      console.error(error);
      throw "sync_wrong_master_password";
    }

    await rekey(data[saltKey], hmacSecret, decryptionKey);
  },

  _calculateSignature: async function(data, revision, rawSecret)
  {
    let values = [revision];
    let keys = Object.keys(data);
    keys.sort();
    for (let key of keys)
      values.push([key, data[key]]);
    let secret = await importHmacSecret(rawSecret);
    return await getDigest(secret, JSON.stringify(values));
  },

  _validateSignature: async function(data, revision, rawSecret, expectedSignature)
  {
    let signature = await this._calculateSignature(data, revision, rawSecret);
    if (signature != expectedSignature)
      throw "sync_tampered_data";
  },

  _validateRemoteData: async function(data, local)
  {
    let remote;
    try
    {
      remote = JSON.parse(data.contents);
    }
    catch (e)
    {
      throw "sync_unknown_data_format";
    }

    if (!remote || typeof remote != "object" ||
        remote.application != local.application ||
        (remote.format != 2 && remote.format != 3) ||
        !remote.data || typeof remote.data != "object" ||
        typeof remote.data[saltKey] != "string" ||
        typeof remote.data[hmacSecretKey] != "string")
    {
      throw "sync_unknown_data_format";
    }

    if (remote.data[saltKey] != local.data[saltKey])
    {
      await this._rekey(remote.data);
      throw "sync_rekeyed";
    }

    if (local.data[this.secretKey] && local.data[this.secretKey] != remote.data[this.secretKey])
      throw "sync_unrelated_client";

    if (remote.data[this.secretKey])
    {
      if (typeof remote.revision != "number" || remote.revision <= 0 || typeof remote.signature != "string")
        throw "sync_unknown_data_format";

      if (this.data.revision && remote.revision < this.data.revision)
        throw "sync_tampered_data";

      let secret = this.data.secret;
      if (!secret)
        secret = await decrypt(remote.data[this.secretKey]);

      await this._validateSignature(remote.data, remote.revision, secret, remote.signature);
      return [remote, secret, remote.revision];
    }
    else
      return [remote, null, null];
  },

  _syncNoLock: async function(nestingLevel)
  {
    const path = "/passwords.json";
    let {provider, token, username} = this.data;

    try
    {
      let remoteData = await getProvider(provider).get(path, token, username);
      let localData = await exportPasswordData([this.secretKey]);

      let local = JSON.parse(localData);
      let remote = null;
      let fileRevision = null;
      if (remoteData)
      {
        fileRevision = remoteData.revision;

        let secret, revision;
        [remote, secret, revision] = await this._validateRemoteData(remoteData, local);

        if (secret)
        {
          this.data.secret = secret;
          this.data.revision = revision;
          await emit(events, "dataModified");
          await storage.set(this.storageKey, this.data, null);
        }
      }

      let modifiedKeys = await tracker.getModifiedKeys();

      let modified = !remote;
      let additions = [];
      let removals = [];
      if (remote)
      {
        for (let key of Object.keys(remote.data))
        {
          if (!modifiedKeys.has(key))
          {
            local.data[key] = remote.data[key];
            additions.push([key, local.data[key]]);
          }
          else if (local.data[key] != remote.data[key])
            modified = true;
        }

        for (let key of Object.keys(local.data))
        {
          if (!remote.data.hasOwnProperty(key))
          {
            if (!modifiedKeys.has(key))
            {
              delete local.data[key];
              removals.push(key);
            }
            else
              modified = true;
          }
        }
      }

      if (modified)
      {
        local.revision = (this.data.revision || 0) + 1;
        if (!this.data.secret)
        {
          this.data.secret = generateRandom(32);
          await storage.set(this.secretKey, this.data.secret);
          local.data[this.secretKey] = await storage.get(this.secretKey, null);
        }

        local.signature = await this._calculateSignature(local.data, local.revision, this.data.secret);
        await getProvider(provider).put(path, JSON.stringify(local), fileRevision, token, username);

        this.data.revision = local.revision;
        await emit(events, "dataModified");
        await storage.set(this.storageKey, this.data, null);
      }

      tracker.override = true;
      try
      {
        await tracker.clearModifiedKeys();
        for (let [key, value] of additions)
          await storage.set(key, value, null);
        if (removals.length)
          await storage.delete(removals);
      }
      finally
      {
        tracker.override = false;
      }
    }
    catch (e)
    {
      if (e == "master_password_required")
        await this._reportError("sync_master_password_required");
      else if (e == "sync_wrong_revision" || e == "sync_rekeyed")
      {
        // Retry sync
        if (nestingLevel < MAX_RETRIES)
          await this._syncNoLock(nestingLevel + 1);
        else
          await this._reportError("sync_too_many_retries");
      }
      else
        await this._reportError(e);
    }

    if (nestingLevel == 0)
    {
      this.data.lastSync = Date.now();
      await emit(events, "dataModified");
      await storage.set(this.storageKey, this.data, null);
    }
  },

  sync: async function()
  {
    if (this.currentSync)
    {
      await this.currentSync;
      return;
    }

    if (!navigator.onLine)
    {
      this.data.error = "sync_connection_error";
      await emit(events, "dataModified");
      await storage.set(this.storageKey, this.data, null);
      return;
    }

    delete this.data.error;
    await storage.set(this.storageKey, this.data, null);
    this.currentSync = this._sync(0);

    try
    {
      await emit(events, "dataModified");
      await this.currentSync;
    }
    finally
    {
      this.currentSync = null;
      await emit(events, "dataModified");
    }
  },

  _reportError: async function(e)
  {
    if (!this.data)
      return;

    this.data.error = String(e);
    if (typeof e != "string")
      console.error(e);
    await emit(events, "dataModified");
    await storage.set(this.storageKey, this.data, null);
  },

  _changingPassword: async function(noLock)
  {
    // Disable sync before clearing data, otherwise it will create change
    // entries for everything removed.
    if (noLock)
      await this._disableNoLock();
    else
      await this.disable();
  },

  setup: locked(async function(provider, token, username)
  {
    await tracker.enable();

    this.data = {provider, token, username};
    await emit(events, "dataModified");
    this._start();
    masterPassword.on("changingPassword", this._changingPassword);
    await storage.set(this.storageKey, this.data, null);
  }),

  _disableNoLock: async function()
  {
    if (!this.data)
      return;

    this.data = null;
    this._stop();
    await emit(events, "dataModified");
    masterPassword.off("changingPassword", this._changingPassword);

    await storage.delete(this.storageKey);
    await storage.delete(this.secretKey);
    await tracker.disable();
  },
};
engine._sync = locked(engine._syncNoLock);
engine.disable = locked(engine._disableNoLock);
engine._changingPassword = engine._changingPassword.bind(engine);
engine._check = engine._check.bind(engine);
engine.init();

export function getSyncData()
{
  return engine.data || {};
}

export function isSyncing()
{
  return !!engine.currentSync;
}

export async function authorize(provider, username)
{
  try
  {
    let token = await getProvider(provider).authorize(username);
    await engine.setup(provider, token, username);
  }
  catch (error)
  {
    console.error(error);
  }
}

export async function getManualAuthURL(provider, username)
{
  return await getProvider(provider).getManualAuthURL(username);
}

export async function manualAuthorization(provider, username, code)
{
  let token = await getProvider(provider).processAuthCode(code);
  await engine.setup(provider, token, username);
}

export async function disableSync()
{
  await engine.disable();
}

export async function sync()
{
  await engine.sync();
}
