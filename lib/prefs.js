/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import browser from "./browserAPI";
import {EventTarget, emit} from "./eventTarget";
import {prefsPrefix} from "./storage";

let events = EventTarget();
export default events;

export function getPref(name, defaultValue)
{
  let key = prefsPrefix + name;
  return browser.storage.local.get(key).then(items => key in items ? items[key] : defaultValue);
}

export function setPref(name, value)
{
  let key = prefsPrefix + name;
  return browser.storage.local.set({[key]: value}).then(() => emit(events, name, name, value));
}
