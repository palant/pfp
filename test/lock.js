/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {Lock} = require("../build-test/lib");

exports.testSequentialLock = function(test)
{
  let lock = new Lock();

  let promise = lock.acquire().then(() =>
  {
    lock.release();
  }).then(() =>
  {
    return lock.acquire();
  }).then(() =>
  {
    lock.release();
  }).then(() => test.done()).catch(e =>
  {
    console.error(e);
    test.ok(false, "Exception thrown");
    test.done();
  });
};

exports.testParallelLock = function(test)
{
  let lock = new Lock();

  let result = [];
  let promise1 = lock.acquire().then(() =>
  {
    result.push(1);
    return new Promise((resolve, reject) =>
    {
      setTimeout(resolve, 200);
    });
  }).then(() =>
  {
    result.push(2);
  }).finally(() => lock.release());

  let promise2 = lock.acquire().then(() =>
  {
    result.push(3);
  }).finally(() => lock.release());

  Promise.all([promise1, promise2]).then(() =>
  {
    test.deepEqual(result, [1, 2, 3]);
    test.done();
  }).catch(e =>
  {
    console.error(e);
    test.ok(false, "Exception thrown");
    test.done();
  });
};

exports.testDeadLock = function(test)
{
  let lock = new Lock();

  lock.acquire().then(() =>
  {
    return lock.acquire();
  }).then(() =>
  {
    test.ok(false, "Acquired lock twice");
  }).catch(e =>
  {
    console.error(e);
    test.ok(false, "Exception thrown");
  });

  setTimeout(() => test.done(), 200);
};

exports.testMultipleLocks = function(test)
{
  let lock1 = new Lock();
  let lock2 = new Lock();

  lock1.acquire().then(() =>
  {
    return lock2.acquire();
  }).then(() =>
  {
    test.ok(true, "Acquired two locks in parallel");
  }).finally(() =>
  {
    lock1.release();
    lock2.release();
  }).catch(e =>
  {
    console.error(e);
    test.ok(false, "Exception thrown");
  }).then(() => test.done());
};

exports.testDoubleRelease = function(test)
{
  let lock = new Lock();

  lock.acquire().then(() =>
  {
    lock.release();
  }).catch(e =>
  {
    console.error(e);
    test.ok(false, "Exception thrown");
  }).then(() =>
  {
    lock.release();
  }).then(() =>
  {
    test.ok(false, "Successfully released lock twice");
  }).catch(() => void 0).then(() => test.done());
};
