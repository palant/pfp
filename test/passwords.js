/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let passwords = require("../lib/passwords");
let masterPassword = require("../lib/masterPassword");

let dummyMaster = "foobar";

let generated1 = {
  site: "example.com",
  name: "foo",
  length: 8,
  lower: true,
  upper: false,
  number: true,
  symbol: false,
  password: "r8hx8be6"
};

let generated2 = {
  site: "example.com",
  name: "bar",
  length: 16,
  lower: false,
  upper: true,
  number: false,
  symbol: true,
  password: "WSSH(Z?HM{H[V^}U"
};

let legacy1 = {
  site: "example.com",
  name: "foo",
  password: "bar"
};

let legacy2 = {
  site: "example.com",
  name: "bar",
  password: "foo"
};

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
  let {storage} = require("storage");
  for (let key of Object.keys(storage))
    delete storage[key];

  let {values: prefs} = require("prefs");
  for (let key of Object.keys(prefs))
    delete prefs[key];

  callback();
};

exports.testAddRemoveGenerated = function(test)
{
  Promise.resolve().then(() =>
  {
    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      [generated1.name]: {
        type: "pbkdf2-sha1-generated",
        length: generated1.length,
        lower: generated1.lower,
        upper: generated1.upper,
        number: generated1.number,
        symbol: generated1.symbol
      }
    });

    return passwords.addGenerated(generated2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      [generated1.name]: {
        type: "pbkdf2-sha1-generated",
        length: generated1.length,
        lower: generated1.lower,
        upper: generated1.upper,
        number: generated1.number,
        symbol: generated1.symbol
      },
      [generated2.name]: {
        type: "pbkdf2-sha1-generated",
        length: generated2.length,
        lower: generated2.lower,
        upper: generated2.upper,
        number: generated2.number,
        symbol: generated2.symbol
      }
    });

    let [origSite, site, pwdList2] = passwords.getPasswords(generated1.site);
    test.equal(origSite, generated1.site);
    test.equal(site, generated1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("www." + generated1.site);
    test.equal(origSite, generated1.site);
    test.equal(site, generated1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("sub." + generated1.site);
    test.equal(origSite, "sub." + generated1.site);
    test.equal(site, "sub." + generated1.site);
    test.deepEqual(pwdList2, {});

    return passwords.removePassword(generated1.site, generated1.name);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(pwdList, {
      [generated2.name]: {
        type: "pbkdf2-sha1-generated",
        length: generated2.length,
        lower: generated2.lower,
        upper: generated2.upper,
        number: generated2.number,
        symbol: generated2.symbol
      }
    });

    return passwords.removePassword(generated1.site, generated1.name);
  }).then(() =>
  {
    test.ok(false, "Succeeded removing a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.removePassword("sub." + generated2.site, generated2.name);
  }).then(() =>
  {
    test.ok(false, "Succeeded removing a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(done.bind(test));
};

exports.testAddRemoveLegacy = function(test)
{
  Promise.resolve().then(() =>
  {
    return passwords.addLegacy(legacy1);
  }).then(() =>
  {
    test.ok(false, "Added legacy password before knowing master password");
  }).catch(expectedValue.bind(test, "master-password-required")).then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return passwords.addLegacy(legacy1);
  }).then(pwdList =>
  {
    test.deepEqual(Object.keys(pwdList), [legacy1.name]);
    test.equal(pwdList[legacy1.name].type, "pbkdf2-sha1-aes256-encrypted");
    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    test.deepEqual(Object.keys(pwdList), [legacy1.name, legacy2.name]);
    test.equal(pwdList[legacy1.name].type, "pbkdf2-sha1-aes256-encrypted");
    test.equal(pwdList[legacy2.name].type, "pbkdf2-sha1-aes256-encrypted");

    let [origSite, site, pwdList2] = passwords.getPasswords(legacy1.site);
    test.equal(origSite, legacy1.site);
    test.equal(site, legacy1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("www." + legacy1.site);
    test.equal(origSite, legacy1.site);
    test.equal(site, legacy1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = passwords.getPasswords("sub." + legacy1.site);
    test.equal(origSite, "sub." + legacy1.site);
    test.equal(site, "sub." + legacy1.site);
    test.deepEqual(pwdList2, {});

    return passwords.removePassword(legacy1.site, legacy1.name);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(Object.keys(pwdList), [legacy2.name]);
    test.equal(pwdList[legacy2.name].type, "pbkdf2-sha1-aes256-encrypted");

    return passwords.removePassword(legacy1.site, legacy1.name);
  }).then(() =>
  {
    test.ok(false, "Succeeded removing a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.removePassword("sub." + legacy2.site, legacy2.name);
  }).then(() =>
  {
    test.ok(false, "Succeeded removing a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(done.bind(test));
};

exports.testAddGeneratedExisting = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return passwords.addGenerated(generated1);
  }).catch(unexpectedError.bind(test)).then(() =>
  {
    return passwords.addGenerated(generated1);
  }).then(() =>
  {
    test.ok(false, "Succeeded adding the same password twice");
  }).catch(expectedValue.bind(test, "alreadyExists")).then(() =>
  {
    return passwords.addLegacy(legacy1);
  }).catch(expectedValue.bind(test, "alreadyExists")).then(() =>
  {
    return passwords.removePassword(generated1.site, generated1.name);
  }).then(() =>
  {
    return passwords.addLegacy(legacy1);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testRetrieval = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    return passwords.getPassword(generated1.site, generated1.name);
  }).then(pwd =>
  {
    test.equal(pwd, generated1.password);
    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    return passwords.getPassword(legacy2.site, legacy2.name);
  }).then(pwd =>
  {
    test.equal(pwd, legacy2.password);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testAllPasswords = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.getAllPasswords(), {});

    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: {
          [generated1.name]: {
            type: "pbkdf2-sha1-generated",
            length: generated1.length,
            lower: generated1.lower,
            upper: generated1.upper,
            number: generated1.number,
            symbol: generated1.symbol
          }
        },
        aliases: []
      }
    });

    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    let list = JSON.parse(JSON.stringify(passwords.getAllPasswords()));
    delete list[generated2.site].passwords[generated2.name].password;
    test.deepEqual(list, {
      [generated1.site]: {
        passwords: {
          [generated1.name]: {
            type: "pbkdf2-sha1-generated",
            length: generated1.length,
            lower: generated1.lower,
            upper: generated1.upper,
            number: generated1.number,
            symbol: generated1.symbol
          },
          [legacy2.name]: {
            type: "pbkdf2-sha1-aes256-encrypted"
          }
        },
        aliases: []
      }
    });

    return passwords.addGenerated(Object.assign({}, generated2, {site: "sub." + generated2.site}));
  }).then(pwdList =>
  {
    let list = JSON.parse(JSON.stringify(passwords.getAllPasswords()));
    delete list[generated2.site].passwords[generated2.name].password;
    test.deepEqual(list, {
      [generated1.site]: {
        passwords: {
          [generated1.name]: {
            type: "pbkdf2-sha1-generated",
            length: generated1.length,
            lower: generated1.lower,
            upper: generated1.upper,
            number: generated1.number,
            symbol: generated1.symbol
          },
          [legacy2.name]: {
            type: "pbkdf2-sha1-aes256-encrypted"
          }
        },
        aliases: []
      },
      ["sub." + generated2.site]: {
        passwords: {
          [generated2.name]: {
            type: "pbkdf2-sha1-generated",
            length: generated2.length,
            lower: generated2.lower,
            upper: generated2.upper,
            number: generated2.number,
            symbol: generated2.symbol
          }
        },
        aliases: []
      }
    });

    return passwords.removePassword("sub." + generated2.site, generated2.name);
  }).then(pwdList =>
  {
    let list = JSON.parse(JSON.stringify(passwords.getAllPasswords()));
    delete list[generated2.site].passwords[generated2.name].password;
    test.deepEqual(list, {
      [generated1.site]: {
        passwords: {
          [generated1.name]: {
            type: "pbkdf2-sha1-generated",
            length: generated1.length,
            lower: generated1.lower,
            upper: generated1.upper,
            number: generated1.number,
            symbol: generated1.symbol
          },
          [legacy2.name]: {
            type: "pbkdf2-sha1-aes256-encrypted"
          }
        },
        aliases: []
      }
    });
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};
