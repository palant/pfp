/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let passwords = require("../lib/passwords");

exports.testAddRemove = function(test)
{
  Promise.resolve().then(() =>
  {
    return passwords.addGenerated({
      site: "example.com",
      name: "foo",
      length: 8,
      lower: true,
      upper: false,
      number: true,
      symbol: false
    });
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      foo: {
        type: "pbkdf2-sha1-generated",
        length: 8,
        lower: true,
        upper: false,
        number: true,
        symbol: false
      }
    });

    return passwords.addGenerated({
      site: "example.com",
      name: "bar",
      length: 16,
      lower: false,
      upper: true,
      number: false,
      symbol: true
    });
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      foo: {
        type: "pbkdf2-sha1-generated",
        length: 8,
        lower: true,
        upper: false,
        number: true,
        symbol: false
      },
      bar: {
        type: "pbkdf2-sha1-generated",
        length: 16,
        lower: false,
        upper: true,
        number: false,
        symbol: true
      }
    });

    let [origSite, site, pwdList2] = passwords.getPasswords("example.com");
    test.equal(origSite, "example.com");
    test.equal(site, "example.com");
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("www.example.com");
    test.equal(origSite, "example.com");
    test.equal(site, "example.com");
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("example.info");
    test.equal(origSite, "example.info");
    test.equal(site, "example.info");
    test.deepEqual(pwdList2, {});

    return passwords.removePassword("example.com", "foo");
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      bar: {
        type: "pbkdf2-sha1-generated",
        length: 16,
        lower: false,
        upper: true,
        number: false,
        symbol: true
      }
    });

    test.done();
  }).catch(error =>
  {
    test.ok(false, "Received error: " + error);
    test.done();
  });
};
