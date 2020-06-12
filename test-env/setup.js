/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import chai from "chai";
import {TextEncoder, TextDecoder} from "util";

import browser from "./browserAPI.js";
import {subtle, getRandomValues} from "./fake-crypto.js";
import {FakeWorker} from "./fake-worker.js";

let origGlobal = null;

export default {
  setup()
  {
    if (!origGlobal)
      origGlobal = Object.assign({}, global);

    global.expect = chai.expect;
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
    global.Worker = FakeWorker;
    global.atob = str => Buffer.from(str, "base64").toString("binary");
    global.btoa = str => Buffer.from(str, "binary").toString("base64");
    global.navigator = {
      onLine: true
    };
    global.window = global;
    global.crypto = {subtle, getRandomValues};
    global.browser = browser;
  },
  teardown()
  {
    if (!origGlobal)
      return;

    for (let key of Object.keys(global))
    {
      if (origGlobal.hasOwnProperty(key))
        global[key] = origGlobal[key];
      else
        delete global[key];
    }
  }
};
