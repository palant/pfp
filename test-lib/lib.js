/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import "../lib/importers/default";
import "../lib/importers/lastPass";
import * as crypto from "../lib/crypto";
import Lock from "../lib/lock";
import * as masterPassword from "../lib/masterPassword";
import * as passwords from "../lib/passwords";
import storageDefault, * as storageExports from "../lib/storage";
import * as recoveryCodes from "../lib/recoveryCodes";
import * as sync from "../lib/sync";
import browserAPI from "./browserAPI";
import * as fakeCrypto from "./fake-crypto";
import provider from "./sync-providers/dropbox";

global.crypto = fakeCrypto;

export const storage = Object.assign({}, storageDefault, storageExports);

export {
  crypto, Lock, masterPassword, passwords, recoveryCodes, sync,
  browserAPI, fakeCrypto, provider
};
