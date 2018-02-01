/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

function EventTarget()
{
  this._listeners = [];
}
EventTarget.prototype =
{
  addListener: function(listener)
  {
    this._listeners.push(listener);
  },

  removeListener: function(listener)
  {
    let index = this._listeners.indexOf(listener);
    if (index >= 0)
      this._listeners.splice(index, 1);
  },

  _emit: function(...args)
  {
    for (let listener of this._listeners)
      listener(...args);
  }
};

exports.EventTarget = EventTarget;
