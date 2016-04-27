/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let proto = {
  on: function(eventName, listener)
  {
    if (!(eventName in this._listeners))
      this._listeners[eventName] = [];
    this._listeners[eventName].push(listener);
  },

  off: function(eventName, listener)
  {
    let index = (eventName in this._listeners ? this._listeners[eventName].indexOf(listener) : -1);
    if (index >= 0)
      this._listeners[eventName].splice(index, 1);
  },

  once: function(eventName, listener)
  {
    let wrapper = (...args) =>
    {
      this.off(eventName, wrapper);
      listener(...args);
    };
    this.on(eventName, wrapper);
  }
};

exports.EventTarget = function()
{
  let result = Object.create(proto);
  result._listeners = [];
  return result;
};
