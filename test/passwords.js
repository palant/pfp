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
  legacy: true,
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
  password: "$X*RR~V}?;FY[T|~"
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
  let {data: storage} = require("../test-lib/storage");
  for (let key of Object.keys(storage))
    delete storage[key];

  let {data: prefs} = require("../test-lib/prefs");
  for (let key of Object.keys(prefs))
    delete prefs[key];

  masterPassword.forgetPassword();

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
      symbol: generated1.symbol,
      hasNotes: false
    }]);

    return passwords.addGenerated(generated2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: false
    },
    {
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol,
      hasNotes: false
    }]);

    return Promise.all([
      pwdList,
      passwords.getPasswords(generated1.site),
      passwords.getPasswords("www." + generated1.site),
      passwords.getPasswords("www." + generated1.site + "."),
      passwords.getPasswords("sub." + generated1.site + ".")
    ]);
  }).then(([pwdList, siteData, wwwSiteData, wwwSiteData2, subSiteData]) =>
  {
    let [origSite, site, pwdList2] = siteData;
    test.equal(origSite, generated1.site);
    test.equal(site, generated1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = wwwSiteData;
    test.equal(origSite, generated1.site);
    test.equal(site, generated1.site);
    test.deepEqual(pwdList2, pwdList);
    test.deepEqual(wwwSiteData, wwwSiteData2);

    [origSite, site, pwdList2] = subSiteData;
    test.equal(origSite, "sub." + generated1.site);
    test.equal(site, "sub." + generated1.site);
    test.deepEqual(pwdList2, []);

    return passwords.removePassword(generated1.site, generated1.name, generated1.revision);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: false
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
      name: legacy1.name,
      hasNotes: false
    }]);
    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "stored",
      name: legacy2.name,
      hasNotes: false
    }, {
      type: "stored",
      name: legacy1.name,
      hasNotes: false
    }]);

    return Promise.all([
      pwdList,
      passwords.getPasswords(legacy1.site),
      passwords.getPasswords("www." + legacy1.site),
      passwords.getPasswords("www." + legacy1.site + "."),
      passwords.getPasswords("sub." + legacy1.site + ".")
    ]);
  }).then(([pwdList, siteData, wwwSiteData, wwwSiteData2, subSiteData]) =>
  {
    let [origSite, site, pwdList2] = siteData;
    test.equal(origSite, legacy1.site);
    test.equal(site, legacy1.site);
    test.deepEqual(pwdList2, pwdList);

    [origSite, site, pwdList2] = wwwSiteData;
    test.equal(origSite, legacy1.site);
    test.equal(site, legacy1.site);
    test.deepEqual(pwdList2, pwdList);
    test.deepEqual(wwwSiteData, wwwSiteData2);

    [origSite, site, pwdList2] = subSiteData;
    test.equal(origSite, "sub." + legacy1.site);
    test.equal(site, "sub." + legacy1.site);
    test.deepEqual(pwdList2, []);

    return passwords.removePassword(legacy1.site, legacy1.name);
  }).catch(unexpectedError.bind(test)).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "stored",
      name: legacy2.name,
      hasNotes: false
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
  let expectedSite = "example.info";
  function expectData(expectedAlias, expectedPwdList)
  {
    return passwords.getAlias(expectedSite).then(([site, alias]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);

      return passwords.getAlias("www." + expectedSite);
    }).then(([site, alias]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);

      return passwords.getAlias(expectedSite + ".");
    }).then(([site, alias]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);

      return passwords.getPasswords(expectedSite);
    }).then(([site, alias, pwdList]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);
      test.deepEqual(pwdList, expectedPwdList);

      return passwords.getPasswords("www." + expectedSite);
    }).then(([site, alias, pwdList]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);
      test.deepEqual(pwdList, expectedPwdList);

      return passwords.getPasswords(expectedSite + ".");
    }).then(([site, alias, pwdList]) =>
    {
      test.equal(site, expectedSite);
      test.equal(alias, expectedAlias);
      test.deepEqual(pwdList, expectedPwdList);
    });
  }

  Promise.resolve().then(() => passwords.addGenerated(generated1)).then(() =>
  {
    return expectData(expectedSite, []);
  }).then(() =>
  {
    return passwords.addAlias(expectedSite, generated1.site);
  }).then(() =>
  {
    return expectData(generated1.site, [{
      type: "generated",
      name: generated1.name,
      revision: "",
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol,
      hasNotes: false
    }]);
  }).then(() =>
  {
    return passwords.removeAlias(expectedSite);
  }).then(() =>
  {
    return expectData(expectedSite, []);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testAliasErrors = function(test)
{
  Promise.resolve().then(() => passwords.addGenerated(generated1)).then(() =>
  {
    return passwords.addAlias(generated1.site, "example.info");
  }).then(() =>
  {
    test.ok(false, "Successfully added an alias for a site with passwords");
  }).catch(expectedValue.bind(test, "site-has-passwords")).then(() =>
  {
    return passwords.removeAlias(generated1.site);
  }).then(() =>
  {
    test.ok(false, "Successfully removed a non-existant alias");
  }).catch(expectedValue.bind(test, "no-such-alias")).then(() =>
  {
    return passwords.removeAlias("example.info");
  }).then(() =>
  {
    test.ok(false, "Successfully removed a non-existant alias");
  }).catch(expectedValue.bind(test, "no-such-alias")).then(done.bind(test));
};

exports.testNotes = function(test)
{
  let notes1 = "foobarnotes";
  let notes2 = "barbasnotes";

  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return passwords.addGenerated(generated2);
  }).then(() =>
  {
    return passwords.setNotes(generated1.site, generated1.name, "", notes1);
  }).then(() =>
  {
    test.ok(false, "Successfully set notes on a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.setNotes("sub." + generated2.site, generated2.name, generated2.revision, notes1);
  }).then(() =>
  {
    test.ok(false, "Successfully set notes on a non-existant password");
  }).catch(expectedValue.bind(test, "no-such-password")).then(() =>
  {
    return passwords.getNotes(generated2.site, generated2.name, generated2.revision);
  }).then(notes =>
  {
    test.equal(notes, null);

    return passwords.setNotes(generated2.site, generated2.name, generated2.revision, notes1);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: true
    }]);

    return Promise.all([pwdList, passwords.getPasswords(generated2.site)]);
  }).then(([pwdList, [origSite, site, pwdList2]]) =>
  {
    test.deepEqual(pwdList2, pwdList);

    return passwords.getNotes(generated2.site, generated2.name, generated2.revision);
  }).then(notes =>
  {
    test.equal(notes, notes1);

    return passwords.setNotes(generated2.site, generated2.name, generated2.revision, notes2);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: true
    }]);

    return passwords.getNotes(generated2.site, generated2.name, generated2.revision);
  }).then(notes =>
  {
    test.equal(notes, notes2);

    return passwords.removeNotes(generated2.site, generated2.name, generated2.revision);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: false
    }]);

    return Promise.all([pwdList, passwords.getPasswords(generated2.site)]);
  }).then(([pwdList, [origSite, site, pwdList2]]) =>
  {
    test.deepEqual(pwdList2, pwdList);

    return passwords.removeNotes(generated2.site, generated2.name, generated2.revision);
  }).then(pwdList =>
  {
    test.deepEqual(pwdList, [{
      type: "generated2",
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      hasNotes: false
    }]);
    return passwords.getNotes(generated2.site, generated2.name, generated2.revision);
  }).then(notes =>
  {
    test.equal(notes, null);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testAllPasswords = function(test)
{
  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(pwdList =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {});

    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: []
      }
    });

    return passwords.addLegacy(legacy2);
  }).then(pwdList =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name,
          hasNotes: false
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: []
      }
    });

    return Promise.all([
      passwords.addAlias("example.info", generated1.site),
      passwords.addAlias("sub1.example.info", generated1.site),
      passwords.addAlias("sub2.example.info", "sub." + generated2.site),
      passwords.addGenerated(Object.assign({}, generated2, {site: "sub." + generated2.site}))
    ]);
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name,
          hasNotes: false
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: ["example.info", "sub1.example.info"]
      },
      ["sub." + generated2.site]: {
        passwords: [{
          type: "generated2",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          hasNotes: false
        }],
        aliases: ["sub2.example.info"]
      }
    });

    return passwords.setNotes(legacy2.site, legacy2.name, "", "foobarnotes");
  }).then(pwdList =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name,
          hasNotes: true
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: ["example.info", "sub1.example.info"]
      },
      ["sub." + generated2.site]: {
        passwords: [{
          type: "generated2",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          hasNotes: false
        }],
        aliases: ["sub2.example.info"]
      }
    });

    return passwords.removePassword("sub." + generated2.site, generated2.name, generated2.revision);
  }).then(pwdList =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "stored",
          name: legacy2.name,
          hasNotes: true
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
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
    return passwords.exportPasswordData();
  }).then(exportData =>
  {
    test.deepEqual(exportData, {
      application: "easypasswords",
      format: 1,
      sites: {}
    });

    return passwords.addGenerated(generated1);
  }).then(pwdList =>
  {
    return passwords.exportPasswordData();
  }).then(exportData =>
  {
    test.deepEqual(exportData, {
      application: "easypasswords",
      format: 1,
      sites: {
        [generated1.site]: {
          passwords: {
            [generated1.name]: {
              type: "generated",
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
    return passwords.exportPasswordData();
  }).then(exportData =>
  {
    test.deepEqual(exportData, {
      application: "easypasswords",
      format: 1,
      sites: {
        [generated1.site]: {
          passwords: {
            [generated1.name]: {
              type: "generated",
              length: generated1.length,
              lower: generated1.lower,
              upper: generated1.upper,
              number: generated1.number,
              symbol: generated1.symbol
            },
            [generated2.name + "\n" + generated2.revision]: {
              type: "generated2",
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

    return Promise.all([
      passwords.addAlias("example.info", generated1.site),
      passwords.addLegacy(legacy2)
    ]);
  }).then(() =>
  {
    return passwords.exportPasswordData();
  }).then(exportData =>
  {
    delete exportData.sites[legacy2.site].passwords[legacy2.name].password;
    test.deepEqual(exportData, {
      application: "easypasswords",
      format: 1,
      sites: {
        [generated1.site]: {
          passwords: {
            [generated1.name]: {
              type: "generated",
              length: generated1.length,
              lower: generated1.lower,
              upper: generated1.upper,
              number: generated1.number,
              symbol: generated1.symbol
            },
            [generated2.name + "\n" + generated2.revision]: {
              type: "generated2",
              length: generated2.length,
              lower: generated2.lower,
              upper: generated2.upper,
              number: generated2.number,
              symbol: generated2.symbol
            },
            [legacy2.name]: {
              type: "stored"
            }
          },
          aliases: ["example.info"]
        }
      }
    });

    return passwords.setNotes(generated2.site, generated2.name, generated2.revision, "foobarnotes");
  }).then(() =>
  {
    return passwords.exportPasswordData();
  }).then(exportData =>
  {
    test.ok(exportData.sites[generated2.site].passwords[generated2.name + "\n" + generated2.revision].notes);
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testImportErrors = function(test)
{
  Promise.resolve().then(() =>
  {
    return passwords.importPasswordData("foobar");
  }).then(() =>
  {
    test.ok(false, "Imported malformed JSON");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    return passwords.importPasswordData(JSON.stringify(42));
  }).then(() =>
  {
    test.ok(false, "Imported non-object");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    return passwords.importPasswordData(JSON.stringify({
      application: "foobar",
      format: 1,
      sites: {}
    }));
  }).then(() =>
  {
    test.ok(false, "Imported unknown application data");
  }).catch(expectedValue.bind(test, "unknown-data-format")).then(() =>
  {
    return passwords.importPasswordData(JSON.stringify({
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
    return passwords.importPasswordData(JSON.stringify({
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
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: []
      }
    });
  }).then(() =>
  {
    return passwords.importPasswordData(JSON.stringify({
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
              type: "generated2",
              length: generated2.length,
              lower: generated2.lower,
              upper: generated2.upper,
              number: generated2.number,
              symbol: generated2.symbol,
              notes: "JUcNu0W/U+zrGe1qxOSi1Q==_dOxyFz2Gbx0TxauU+dQkeA=="
            },
            [legacy2.name]: {
              type: "pbkdf2-sha1-aes256-encrypted"
            }
          },
          aliases: ["example.info"]
        }
      }
    }));
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "generated2",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          hasNotes: true
        }, {
          type: "generated",
          name: generated1.name,
          revision: "",
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol,
          hasNotes: false
        }],
        aliases: ["example.info"]
      }
    });

    return passwords.getNotes(generated2.site, generated2.name, generated2.revision);
  }).then(notes =>
  {
    test.equal(notes, "foobarnotes");

    return passwords.importPasswordData(JSON.stringify({
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
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "generated2",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          hasNotes: true
        }, {
          type: "stored",
          name: legacy1.name,
          hasNotes: false
        }],
        aliases: ["example.info"]
      }
    });

    return passwords.getPassword(legacy1.site, legacy1.name);
  }).then(pwd =>
  {
    test.equal(pwd, legacy1.password);
  }).then(() =>
  {
    return passwords.importPasswordData(JSON.stringify({
      application: "easypasswords",
      format: 1,
      sites: {
        "example.info": {
          passwords: {},
          aliases: [generated1.site]
        }
      }
    }));
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {
      [generated1.site]: {
        passwords: [{
          type: "generated2",
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          hasNotes: true
        }, {
          type: "stored",
          name: legacy1.name,
          hasNotes: false
        }],
        aliases: []
      }
    });
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};

exports.testRemoveAll = function(test)
{
  function addData()
  {
    return Promise.all([
      passwords.addGenerated(generated1),
      passwords.addLegacy(legacy2),
      passwords.addGenerated(Object.assign({}, generated2, {site: "sub." + generated2.site})),
      passwords.addAlias("example.info", generated1.site)
    ]);
  }

  Promise.resolve().then(() =>
  {
    return masterPassword.changePassword(dummyMaster);
  }).then(() =>
  {
    return addData();
  }).then(() =>
  {
    return passwords.removeAll();
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {});

    return addData();
  }).then(() =>
  {
    return masterPassword.changePassword(dummyMaster + dummyMaster);
  }).then(() =>
  {
    return passwords.getAllPasswords();
  }).then(allPasswords =>
  {
    test.deepEqual(allPasswords, {});
  }).catch(unexpectedError.bind(test)).then(done.bind(test));
};
