/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {EventTarget} = require("sdk/event/target");
let {emit} = require("sdk/event/core");

exports.Page = function(options)
{
  let result = Object.create(exports.Page.prototype);
  result.frame = document.createElement("iframe");
  document.body.appendChild(result.frame);

  result.port = EventTarget();
  result.frame.__port = EventTarget();
  result.port.emit = function(...args)
  {
    emit(result.frame.__port, ...args);
  };
  result.frame.__port.emit = function(...args)
  {
    emit(result.port, ...args);
  };

  result.frame.src = options.contentURL;

  return result;
};
