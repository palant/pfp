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
  revision: "2",
  length: 16,
  lower: false,
  upper: true,
  number: false,
  symbol: true,
  password: "VX~RBJ^NCBH(#;N["
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
    test.deepEqual(pwdList, [{
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]);

    return passwords.addGenerated(generated2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol
    },
    {
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]);

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
    test.deepEqual(pwdList2, []);

    return passwords.removePassword(generated1.site, generated1.name, generated1.revision);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol
    }]);

    return passwords.removePassword(generated1.site, generated1.name, generated1.revision);
  }).then(() =>
  {
    test.ok(false, "Succeeded removing a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.removePassword("sub." + generated2.site, generated2.name, "");
  }).then(() =>
  {
    test.ok(false, "Succeeded removing password with wrong revision number");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.removePassword("sub." + generated2.site, generated2.name, generated2.revision);
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
    test.deepEqual(pwdList, [{
      type: "stored",
      name: legacy1.name
    }]);
    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "stored",
      name: legacy2.name
    }, {
      type: "stored",
      name: legacy1.name
    }]);

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
    test.deepEqual(pwdList2, []);

    return passwords.removePassword(legacy1.site, legacy1.name);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "stored",
      name: legacy2.name
    }]);

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
    return passwords.removePassword(generated1.site, generated1.name, generated1.revision);
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
    return passwords.getPassword(generated1.site, generated1.name, generated1.revision);
  }).then(pwd =>
  {
    test.equal(pwd, generated1.password);
    return passwords.addGenerated(generated2);
  }).then(pwdList =>
  {
    return passwords.getPassword(generated2.site, generated2.name, generated2.revision);
  }).then(pwd =>
  {
    test.equal(pwd, generated2.password);
    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    return passwords.getPassword(legacy2.site, legacy2.name);
  }).then(pwd =>
  {
    test.equal(pwd, legacy2.password);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testAliases = function(test)
{
  Promise.resolve().then(() =>
  {
    return passwords.addGenerated(generated1);
  }).then(() =>
  {
    test.deepEqual(passwords.getAlias("example.info"), ["example.info", "example.info"]);
    test.deepEqual(passwords.getAlias("www.example.info"), ["example.info", "example.info"]);

    test.deepEqual(passwords.getPasswords("example.info"), ["example.info", "example.info", []]);
    test.deepEqual(passwords.getPasswords("www.example.info"), ["example.info", "example.info", []]);

    passwords.addAlias("example.info", generated1.site);

    test.deepEqual(passwords.getAlias("example.info"), ["example.info", generated1.site]);
    test.deepEqual(passwords.getAlias("www.example.info"), ["example.info", generated1.site]);

    test.deepEqual(passwords.getPasswords("example.info"), ["example.info", generated1.site, [{
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]]);
    test.deepEqual(passwords.getPasswords("www.example.info"), ["example.info", generated1.site, [{
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]]);

    passwords.removeAlias("example.info");

    test.deepEqual(passwords.getAlias("example.info"), ["example.info", "example.info"]);
    test.deepEqual(passwords.getAlias("www.example.info"), ["example.info", "example.info"]);

    test.deepEqual(passwords.getPasswords("example.info"), ["example.info", "example.info", []]);
    test.deepEqual(passwords.getPasswords("www.example.info"), ["example.info", "example.info", []]);

    passwords.removeAlias("example.info");

    test.deepEqual(passwords.getAlias("example.info"), ["example.info", "example.info"]);
    test.deepEqual(passwords.getAlias("www.example.info"), ["example.info", "example.info"]);

    test.deepEqual(passwords.getPasswords("example.info"), ["example.info", "example.info", []]);
    test.deepEqual(passwords.getPasswords("www.example.info"), ["example.info", "example.info", []]);
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
        passwords: [{
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    passwords.addAlias("example.info", generated1.site);
    passwords.addAlias("sub1.example.info", generated1.site);
    passwords.addAlias("sub2.example.info", "sub." + generated2.site);
    return passwords.addGenerated(Object.assign({}, generated2, {site: "sub." + generated2.site}));
  }).then(pwdList =>
  {
    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info", "sub1.example.info"]
      },
      ["sub." + generated2.site]: {
        passwords: [{
          type: "generated",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol
        }],
        aliases: ["sub2.example.info"]
      }
    });

    return passwords.removePassword("sub." + generated2.site, generated2.name, generated2.revision);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info", "sub1.example.info"]
      }
    });
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testExport = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    test.deepEqual(passwords.exportPasswordData(), {
      application: "easypasswords",
      format: 1,
      sites: {}
    });

    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.exportPasswordData(), {
      application: "easypasswords",
      format: 1,
      sites: {
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
      }
    });

    return passwords.addGenerated(generated2);
  }).then(pwdList =>
  {
    test.deepEqual(passwords.exportPasswordData(), {
      application: "easypasswords",
      format: 1,
      sites: {
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
            [generated2.name + "\n" + generated2.revision]: {
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
      }
    });

    passwords.addAlias("example.info", generated1.site);
    return passwords.addLegacy(legacy2);
  }).then(() =>
  {
    let data = passwords.exportPasswordData();
    delete data.sites[legacy2.site].passwords[legacy2.name].password;
    test.deepEqual(data, {
      application: "easypasswords",
      format: 1,
      sites: {
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
            [generated2.name + "\n" + generated2.revision]: {
              type: "pbkdf2-sha1-generated",
              length: generated2.length,
              lower: generated2.lower,
              upper: generated2.upper,
              number: generated2.number,
              symbol: generated2.symbol
            },
            [legacy2.name]: {
              type: "pbkdf2-sha1-aes256-encrypted"
            }
          },
          aliases: ["example.info"]
        }
      }
    });
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testImportErrors = function(test)
{
  Promise.resolve().then(() =>
  {
    passwords.importPasswordData("foobar");
  }).then(() =>
  {
    test.ok(false, "Imported malformed JSON");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    passwords.importPasswordData(JSON.stringify(42));
  }).then(() =>
  {
    test.ok(false, "Imported non-object");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    passwords.importPasswordData(JSON.stringify({
      application: "foobar",
      format: 1,
      sites: {}
    }));
  }).then(() =>
  {
    test.ok(false, "Imported unknown application data");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    passwords.importPasswordData(JSON.stringify({
      application: "easypasswords",
      format: 33,
      sites: {}
    }));
  }).then(() =>
  {
    test.ok(false, "Imported unknown format version");
  }).catch(expectedValue.bind(test, "unknown-data-format"))
    .then(done.bind(test));
};

exports.testImport = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    passwords.importPasswordData(JSON.stringify({
      application: "easypasswords",
      format: 1,
      sites: {
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
      }
    }));

    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });
  }).then(() =>
  {
    passwords.importPasswordData(JSON.stringify({
      application: "easypasswords",
      format: 1,
      sites: {
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
            [generated2.name + "\n" + generated2.revision]: {
              type: "pbkdf2-sha1-generated",
              length: generated2.length,
              lower: generated2.lower,
              upper: generated2.upper,
              number: generated2.number,
              symbol: generated2.symbol
            },
            [legacy2.name]: {
              type: "pbkdf2-sha1-aes256-encrypted"
            }
          },
          aliases: ["example.info"]
        }
      }
    }));

    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "generated",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info"]
      }
    });
  }).then(() =>
  {
    passwords.importPasswordData(JSON.stringify({
      application: "easypasswords",
      format: 1,
      sites: {
        [legacy1.site]: {
          passwords: {
            [legacy1.name]: {
              type: "pbkdf2-sha1-aes256-encrypted",
              password: "BaxABw0KMZmYxGTB8vdwIQ==_smbTbzvo8hdAIjnM45A97Q=="
            }
          }
        }
      }
    }));

    test.deepEqual(passwords.getAllPasswords(), {
      [generated1.site]: {
        passwords: [{
          type: "generated",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol
        }, {
          type: "stored",
          name: legacy1.name
        }],
        aliases: ["example.info"]
      }
    });

    return passwords.getPassword(legacy1.site, legacy1.name);
  }).then(pwd =>
  {
    test.equal(pwd, legacy1.password);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};
