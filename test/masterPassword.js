/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let passwords = require("../lib/passwords");
let masterPassword = require("../lib/masterPassword");

let dummyMaster = "foobar";

function expectedValue(expected, value)
{
  this.equal(value, expected);
}

function unexpectedError(error)
{
  this.ok(false, "Unexpected error: " + error);
  console.error(error);
}

function done()
{
  this.done();
}

exports.setUp = function(callback)
{
  let {data: storage} = require("../test-lib/storage");
  for (let key of Object.keys(storage))
    delete storage[key];

  let {data: prefs} = require("../test-lib/prefs");
  for (let key of Object.keys(prefs))
    delete prefs[key];

  masterPassword.forgetPassword();

  callback();
};

exports.testGetAndForget = function(test)
{
  Promise.resolve().then(() =>
  {
    test.equal(masterPassword.get(), null);

    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    test.equal(masterPassword.get(), dummyMaster);

    return masterPassword.forgetPassword();
  }).catch(unexpectedError.bind(test)).then(() =>
  {
    test.equal(masterPassword.get(), null);

    return masterPassword.forgetPassword();
  }).then(() =>
  {
    return masterPassword.checkPassword(dummyMaster);
  }).then(() =>
  {
    test.equal(masterPassword.get(), dummyMaster);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testCheckPassword = function(test)
{
  masterPassword.checkPassword(dummyMaster).then(() =>
  {
    test.ok(false, "Accepted master password when none is set");
  }).catch(expectedValue.bind(test, "declined")).then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return masterPassword.checkPassword(dummyMaster);
  }).catch(unexpectedError.bind(test)).then(() =>
  {
    return masterPassword.checkPassword(dummyMaster + dummyMaster);
  }).then(() =>
  {
    test.ok(false, "Accepted wrong master password");
  }).catch(expectedValue.bind(test, "declined")).then(done.bind(test));
};

exports.testState = function(test)
{
  masterPassword.state.then(state =>
  {
    test.equal(state, "unset");

    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return masterPassword.state;
  }).then(state =>
  {
    test.equal(state, "known");

    return masterPassword.forgetPassword();
  }).then(() =>
  {
    return masterPassword.state;
  }).then(state =>
  {
    test.equal(state, "set");

    return masterPassword.checkPassword(dummyMaster);
  }).then(() =>
  {
    return masterPassword.state;
  }).then(state =>
  {
    test.equal(state, "known");
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};
