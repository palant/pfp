/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const {utils: Cu} = Components;
Cu.importGlobalProperties(["indexedDB"]);

let {Services} = Cu.import("resource://gre/modules/Services.jsm", {});
let {AddonManager} = Cu.import("resource://gre/modules/AddonManager.jsm", {});

const DB_NAME = "storage";
const DB_VERSION = 1;
const STORE_NAME = "data";

function getPrincipal()
{
  let uri = Services.io.newURI("indexeddb://easypasswords-at-palant-dot-de", null, null);
  return Services.scriptSecurityManager.createCodebasePrincipal(uri, {});
}

function promisify(request)
{
  return new Promise((resolve, reject) =>
  {
    let onComplete = () =>
    {
      if (request.error)
        reject(request.error);
      else
        resolve(request.result);
    };

    if (request.readyState == "done")
      onComplete();
    else
      request.onsuccess = request.onerror = onComplete;
  });
}

function retrieveData()
{
  let upgraded = false;
  return Promise.resolve().then(() =>
  {
    let principal = getPrincipal();
    let request = indexedDB.openForPrincipal(principal, DB_NAME, {version: DB_VERSION, storage: "persistent"});
    request.onupgradeneeded = () =>
    {
      upgraded = true;
    };
    return promisify(request);
  }).then(db =>
  {
    if (upgraded)
    {
      db.close();
      return deleteData().then(() => null);
    }

    let store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
    let range = IDBKeyRange.lowerBound("");
    return new Promise((resolve, reject) =>
    {
      let request = store.openCursor(range);
      let result = {};
      request.onsuccess = event =>
      {
        let cursor = request.result;
        if (cursor)
        {
          let {name, value} = cursor.value;
          result[name] = value;
          cursor.continue();
        }
        else
        {
          db.close();
          resolve(result);
        }
      };
      request.onerror = event =>
      {
        db.close();
        reject(request.error);
      };
    });
  });
}

function deleteData()
{
  let principal = getPrincipal();
  return Promise.resolve().then(() =>
  {
    return promisify(indexedDB.deleteForPrincipal(principal, DB_NAME, {storage: "persistent"}));
  });
}

function startup({id, webExtension})
{
  webExtension.startup().then(({browser}) =>
  {
    browser.runtime.onConnect.addListener(port =>
    {
      if (port.name != "data-migration")
        return;

      retrieveData().then(data =>
      {
        port.postMessage(data);
      }).catch(e =>
      {
        console.error(e);
        port.postMessage(null);
      });

      port.onMessage.addListener(success =>
      {
        if (!success)
          return;

        deleteData().then(() =>
        {
          AddonManager.getAddonByID(id, addon => addon.reload());
        }).catch(e => console.error(e));
      });
    });
  });
}

function shutdown()
{
}

function install()
{
}

function uninstall()
{
}
