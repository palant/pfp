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
    let wrapper = () =>
    {
      this.off(eventName, wrapper);
      listener.apply(this, arguments);
    };
    this.on(eventName, wrapper);
  },

  emit: function(eventName)
  {
    let args = [].slice.call(arguments, 1);
    for (let listener of this._listeners[eventName] || [])
      listener.apply(null, args);
  }
};

exports.EventTarget = function()
{
  let result = Object.create(proto);
  result._listeners = [];
  return result;
};
