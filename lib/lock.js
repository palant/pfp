/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

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

export default Lock;

export const lock = new Lock();

export function locked(func)
{
  return async function(...params)
  {
    await lock.acquire();
    try
    {
      return await func.call(this, ...params);
    }
    finally
    {
      await lock.release();
    }
  };
}
