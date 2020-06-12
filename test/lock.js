/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Lock from "../lib/lock.js";

describe("lock.js", () =>
{
  it("should allow acquiring and releasing lock sequentially", async function()
  {
    let lock = new Lock();

    await lock.acquire();
    await lock.release();
    await lock.acquire();
    await lock.release();
  });

  it("should sequentialize parallel operations", async function()
  {
    let lock = new Lock();

    let result = [];
    let func1 = async function()
    {
      await lock.acquire();
      result.push(1);
      await new Promise((resolve, reject) =>
      {
        setTimeout(resolve, 200);
      });
      result.push(2);
      await lock.release();
    };

    let func2 = async function()
    {
      await lock.acquire();
      result.push(3);
      await lock.release();
    };

    await Promise.all([func1(), func2()]);

    expect(result).to.deep.equal([1, 2, 3]);
  });

  it("should wait indefinitely on deadlock", function(done)
  {
    setTimeout(() => done(null), 200);

    (async function()
    {
      let lock = new Lock();

      await lock.acquire();
      await lock.acquire();
      expect.fail("Acquired lock twice");
    })().catch(error => done(error));
  });

  it("should allow acquiring two locks in parallel", async function()
  {
    let lock1 = new Lock();
    let lock2 = new Lock();

    await lock1.acquire();
    await lock2.acquire();
    await lock1.release();
    await lock2.release();
  });

  it("should not allow releasing a lock twice", async function()
  {
    let lock = new Lock();

    await lock.acquire();
    await lock.release();
    try
    {
      await lock.release();
      expect.fail("Released lock twice");
    }
    catch (e)
    {
      // Expected
    }
  });
});
