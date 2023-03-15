/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {getPort} from "./messaging.js";
import {
  exportPasswordData, importPasswordData, getPasswords, addAlias,
  removeAlias, addGenerated, addStored, removePassword, getPassword,
  setNotes, getAllPasswords, getAllSites
} from "./passwords.js";
import {
  getState, changePassword, checkPassword, forgetPassword, startAutoLock
} from "./masterPassword.js";
import {fillIn} from "./passwordRetrieval.js";
import {getPref, setPref} from "./prefs.js";
import {
  getValidChars, getCode, formatCode, isValid, decodeCode
} from "./recoveryCodes.js";
import {
  authorize, getManualAuthURL, manualAuthorization, disableSync, sync,
  getSyncData, isSyncing
} from "./sync.js";
import {
  showAllPasswords, isDeprecationAccepted, acceptDeprecation, getLink,
  openLink, getCurrentHost
} from "./ui.js";

const port = getPort("proxy");
port.on("call", handleMessage);

const api = {
  passwords: {
    exportPasswordData, importPasswordData, getPasswords, addAlias,
    removeAlias, addGenerated, addStored, removePassword, getPassword,
    setNotes, getAllPasswords, getAllSites
  },
  masterPassword: {
    getState, changePassword, checkPassword, forgetPassword, startAutoLock
  },
  passwordRetrieval: {
    fillIn
  },
  prefs: {
    getPref, setPref
  },
  recoveryCodes: {
    getValidChars, getCode, formatCode, isValid, decodeCode
  },
  sync: {
    authorize, getManualAuthURL, manualAuthorization, disableSync, sync,
    getSyncData, isSyncing
  },
  ui: {
    showAllPasswords, isDeprecationAccepted, acceptDeprecation, getLink, openLink, getCurrentHost
  }
};

function handleMessage({moduleName, method, args})
{
  if (!api.hasOwnProperty(moduleName) || !api[moduleName].hasOwnProperty(method))
    throw new Error("Unknown API call");

  return api[moduleName][method](...args);
}
