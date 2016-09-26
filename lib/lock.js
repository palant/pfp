/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

if (typeof Promise.prototype.finally == "undefined")
{
  Promise.prototype.finally = function(callback)
  {
    return this.then(result =>
    {
      callback();
      return result;
    }, e =>
    {
      callback();
      throw e;
    });
  };
}

function Lock()
{
  this._queue = [];
}
Lock.prototype =
{
  _locked: false,
  _queue: null,

  acquire: function()
  {
    return new Promise((resolve, reject) =>
    {
      if (this._locked)
        this._queue.push(resolve);
      else
      {
        this._locked = true;
        resolve();
      }
    });
  },

  release: function()
  {
    if (!this._locked)
      throw new Error("Releasing lock without acquiring first");

    if (this._queue.length)
      this._queue.shift()();
    else
      this._locked = false;
  }
};

module.exports = Lock;
