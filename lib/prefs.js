/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI";
import {EventTarget, emit} from "./eventTarget";

let prefs = EventTarget();

function get(name, defaultValue)
{
  let key = "pref:" + name;
  return browser.storage.local.get(key).then(items => key in items ? items[key] : defaultValue);
}
prefs.get = get;

function set(name, value)
{
  let key = "pref:" + name;
  return browser.storage.local.set({[key]: value}).then(() => emit(prefs, name, name, value));
}
prefs.set = set;

export default prefs;
