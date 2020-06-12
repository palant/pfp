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
import {changePassword, checkPassword, forgetPassword} from "./masterPassword.js";
import {fillIn} from "./passwordRetrieval.js";
import {getPref, setPref} from "./prefs.js";
import {
  getValidChars, getCode, formatCode, isValid, decodeCode
} from "./recoveryCodes.js";
import {
  authorize, getManualAuthURL, manualAuthorization, disableSync, sync
} from "./sync.js";
import {showAllPasswords, getLink, openLink} from "./ui.js";

let port = getPort("*");
port.on("_proxy", handleMessage);

const api = {
  passwords: {
    exportPasswordData, importPasswordData, getPasswords, addAlias,
    removeAlias, addGenerated, addStored, removePassword, getPassword,
    setNotes, getAllPasswords, getAllSites
  },
  masterPassword: {
    changePassword, checkPassword, forgetPassword
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
    authorize, getManualAuthURL, manualAuthorization, disableSync, sync
  },
  ui: {
    showAllPasswords, getLink, openLink
  }
};

function handleMessage({messageId, moduleName, method, args})
{
  Promise.resolve().then(() =>
  {
    if (!api.hasOwnProperty(moduleName) || !api[moduleName].hasOwnProperty(method))
      throw new Error("Unknown API call");

    return api[moduleName][method];
  }).then(func =>
  {
    return func(...args);
  }).then(result =>
  {
    port.emit("_proxyResponse-" + messageId, [null, result]);
  }).catch(error =>
  {
    if (typeof error != "string")
    {
      console.error(error);
      if (error && error.stack)
        error = error + "\n" + error.stack;
      else
        error = String(error);
    }
    port.emit("_proxyResponse-" + messageId, [error, null]);
  });
}
