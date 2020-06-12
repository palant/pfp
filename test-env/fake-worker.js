/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

class WorkerEventTarget
{
  constructor(other)
  {
    if (other)
    {
      this.other = other;
      this.other.other = this;
    }
    let listeners = [];

    this.addEventListener = (type, listener) =>
    {
      if (type != "message")
        return;
      listeners.push(listener);
    };
    this.removeEventListener = (type, listener) =>
    {
      if (type != "message")
        return;
      let index = listeners.indexOf(listener);
      if (index >= 0)
        listeners.splice(index, 1);
    };
    this.onmessage = null;

    this.triggerListeners = function(data)
    {
      let event = {type: "message", data};
      if (typeof this.onmessage == "function")
        this.onmessage(event);
      for (let listener of listeners)
        listener(event);
    };

    this.postMessage = data =>
    {
      this._waitFor.then(() =>
      {
        this.other.triggerListeners(data);
      });
    };
  }
}

export class FakeWorker extends WorkerEventTarget
{
  constructor(url)
  {
    super();

    global.self = new WorkerEventTarget(this);
    // Need to use eval() here, otherwise eslint won't be able to parse it
    this._waitFor = global.self._waitFor = eval("import(url)");
  }
}
