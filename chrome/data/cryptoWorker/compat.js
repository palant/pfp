/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let self =
{
  port: window.frameElement.__port
};

let unsafeWindow = window;

function cloneInto(obj, wnd)
{
  return obj;
}

function exportFunction(func, wnd)
{
  return func;
}
