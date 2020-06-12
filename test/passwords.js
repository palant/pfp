/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {derivePassword} from "../lib/crypto.js";
import {
  addGenerated, addStored, removePassword, getPassword, getPasswords,
  getAllPasswords, addAlias, removeAlias, getAlias, getNotes, setNotes,
  exportPasswordData, importPasswordData
} from "../lib/passwords.js";
import {
  changePassword, checkPassword, forgetPassword, getState
} from "../lib/masterPassword.js";
import storage from "../lib/storage.js";
import {storageData} from "../test-env/browserAPI.js";
import "../lib/importers/default.js";
import "../lib/importers/lastPass.js";

const dummyMaster = "foobar";

const generated1 = {
  site: "example.com",
  name: "foo",
  length: 8,
  lower: true,
  upper: false,
  number: true,
  symbol: false,
  password: "jmkg5jd4"
};

const generated2 = {
  site: "example.com",
  name: "bar",
  revision: "2",
  length: 16,
  lower: false,
  upper: true,
  number: false,
  symbol: true,
  notes: "some notes",
  password: "$X*RR~V}?;FY[T|~"
};

const stored1 = {
  site: "example.com",
  name: "foo",
  password: "bar"
};

const stored2 = {
  site: "example.com",
  name: "bar",
  password: "foo",
  notes: "some more notes"
};

const stored3 = {
  site: "example.com",
  name: "bar",
  revision: "2",
  password: "foobar"
};

let origConsoleError;

beforeEach(function()
{
  origConsoleError = console.error;
  console.error = function(...args)
  {
    if (!String(args[0]).includes("Syntax error") && !String(args[0]).includes("encrypted with wrong algorithm"))
      origConsoleError.call(this, ...args);
  };
});

afterEach(function()
{
  console.error = origConsoleError;

  for (let key of Object.keys(storageData))
    delete storageData[key];

  forgetPassword();
});

describe("passwords.js", () =>
{
  it("should add and remove generated passwords", async function()
  {
    await changePassword(dummyMaster);

    let pwdList = await addGenerated(generated1);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated1.site,
      name: generated1.name,
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]);

    pwdList = await addGenerated(generated2);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      notes: generated2.notes
    },
    {
      type: "generated2",
      site: generated1.site,
      name: generated1.name,
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]);

    let [origSite, site, pwdList2] = await getPasswords(generated1.site);
    expect(origSite).to.equal(generated1.site);
    expect(site).to.equal(generated1.site);
    expect(pwdList2).to.deep.equal(pwdList);

    [origSite, site, pwdList2] = await getPasswords("www." + generated1.site);
    expect(origSite).to.equal(generated1.site);
    expect(site).to.equal(generated1.site);
    expect(pwdList2).to.deep.equal(pwdList);

    expect(await getPasswords("www." + generated1.site + ".")).to.deep.equal([origSite, site, pwdList2]);

    [origSite, site, pwdList2] = await getPasswords("sub." + generated1.site + ".");
    expect(origSite).to.equal("sub." + generated1.site);
    expect(site).to.equal("sub." + generated1.site);
    expect(pwdList2).to.deep.equal([]);

    pwdList = await removePassword(generated1);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      notes: generated2.notes
    }]);

    try
    {
      await removePassword(generated1);
      expect.fail("Succeeded removing a non-existant password");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }

    try
    {
      await removePassword({site: generated2.site, name: generated2.name, revision: ""});
      expect.fail("Succeeded removing password with wrong revision number");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }

    try
    {
      await removePassword({site: "sub." + generated2.site, name: generated2.name, revision: generated2.revision});
      expect.fail("Succeeded removing password on wrong site");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }
  });

  it("should add and remove generated passwords", async function()
  {
    try
    {
      await addStored(stored1);
      expect.fail("Added stored password before knowing master password");
    }
    catch (e)
    {
      expect(e).to.equal("master_password_required");
    }

    await changePassword(dummyMaster);

    let pwdList = await addStored(stored1);
    expect(pwdList).to.deep.equal([{
      type: "stored",
      site: stored1.site,
      name: stored1.name,
      password: stored1.password
    }]);

    pwdList = await addStored(stored2);
    expect(pwdList).to.deep.equal([{
      type: "stored",
      site: stored2.site,
      name: stored2.name,
      password: stored2.password,
      notes: stored2.notes
    }, {
      type: "stored",
      site: stored1.site,
      name: stored1.name,
      password: stored1.password
    }]);

    pwdList = await addStored(stored3);
    expect(pwdList).to.deep.equal([{
      type: "stored",
      site: stored2.site,
      name: stored2.name,
      password: stored2.password,
      notes: stored2.notes
    }, {
      type: "stored",
      site: stored3.site,
      name: stored3.name,
      revision: stored3.revision,
      password: stored3.password
    }, {
      type: "stored",
      site: stored1.site,
      name: stored1.name,
      password: stored1.password
    }]);

    let [origSite, site, pwdList2] = await getPasswords(stored1.site);
    expect(origSite).to.equal(stored1.site);
    expect(site).to.equal(stored1.site);
    expect(pwdList2).to.deep.equal(pwdList);

    [origSite, site, pwdList2] = await getPasswords("www." + stored1.site);
    expect(origSite).to.equal(stored1.site);
    expect(site).to.equal(stored1.site);
    expect(pwdList2).to.deep.equal(pwdList);

    expect(await getPasswords("www." + stored1.site + ".")).to.deep.equal([origSite, site, pwdList2]);

    [origSite, site, pwdList2] = await getPasswords("sub." + stored1.site + ".");
    expect(origSite).to.equal("sub." + stored1.site);
    expect(site).to.equal("sub." + stored1.site);
    expect(pwdList2).to.deep.equal([]);

    pwdList = await removePassword(stored3);
    expect(pwdList).to.deep.equal([{
      type: "stored",
      site: stored2.site,
      name: stored2.name,
      password: stored2.password,
      notes: stored2.notes
    }, {
      type: "stored",
      site: stored1.site,
      name: stored1.name,
      password: stored1.password
    }]);

    try
    {
      await removePassword(stored3);
      expect.fail("Succeeded removing a non-existant password");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }

    try
    {
      await removePassword({site: "sub." + stored2.site, name: stored2.name});
      expect.fail("Succeeded removing password on wrong site");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }
  });

  it("should by default refuse replacing existing generated passwords", async function()
  {
    await changePassword(dummyMaster);
    await addGenerated(generated1);

    try
    {
      await addGenerated(generated1);
      expect.fail("Succeeded adding the same password twice");
    }
    catch (e)
    {
      expect(e).to.equal("alreadyExists");
    }

    try
    {
      await addStored(stored1);
      expect.fail("Succeeded adding the same password twice");
    }
    catch (e)
    {
      expect(e).to.equal("alreadyExists");
    }

    await addGenerated(generated1, true);

    await removePassword(generated1);
    await addStored(stored1);
  });

  it("should allow retrieving passwords", async function()
  {
    await changePassword(dummyMaster);

    await addGenerated(generated1);
    expect(await getPassword(generated1)).to.equal(generated1.password);

    await addGenerated(generated2);
    expect(await getPassword(generated2)).to.equal(generated2.password);

    await removePassword(generated2);
    await addStored(stored2);
    await addStored(stored3);

    expect(await getPassword(stored2)).to.equal(stored2.password);
    expect(await getPassword(stored3)).to.equal(stored3.password);
  });

  it("should work with site aliases correctly", async function()
  {
    let expectedSite = "example.info";
    async function expectData(expectedAlias, expectedPwdList)
    {
      for (let test of [expectedSite, "www." + expectedSite, expectedSite + "."])
      {
        let [site, alias] = await getAlias(expectedSite);
        expect(site).to.equal(expectedSite);
        expect(alias).to.equal(expectedAlias);

        let pwdList;
        [site, alias, pwdList] = await getPasswords(expectedSite);
        expect(site).to.equal(expectedSite);
        expect(alias).to.equal(expectedAlias);
        expect(pwdList).to.deep.equal(expectedPwdList);
      }
    }

    await changePassword(dummyMaster);
    await addGenerated(generated1);
    await expectData(expectedSite, []);

    await addAlias(expectedSite, generated1.site);
    await expectData(generated1.site, [{
      type: "generated2",
      site: generated1.site,
      name: generated1.name,
      length: generated1.length,
      lower: generated1.lower,
      upper: generated1.upper,
      number: generated1.number,
      symbol: generated1.symbol
    }]);

    await removeAlias(expectedSite);
    await expectData(expectedSite, []);
  });

  it("should produce expected site alias errors", async function()
  {
    await changePassword(dummyMaster);
    await addGenerated(generated1);

    try
    {
      await addAlias(generated1.site, "example.info");
      expect.fail("Successfully added an alias for a site with passwords");
    }
    catch (e)
    {
      expect(e).to.equal("site_has_passwords");
    }

    try
    {
      await removeAlias(generated1.site);
      expect.fail("Successfully removed a non-existant alias");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_alias");
    }

    try
    {
      await removeAlias("example.info");
      expect.fail("Successfully removed a non-existant alias");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_alias");
    }
  });

  it("should allow adding and retrieving password notes", async function()
  {
    let notes1 = "foobarnotes";
    let notes2 = "barbasnotes";

    await changePassword(dummyMaster);
    await addGenerated(generated2);

    try
    {
      await setNotes(generated1, notes1);
      expect.fail("Successfully set notes on a non-existant password");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }

    try
    {
      await setNotes({site: "sub." + generated2.site, name: generated2.name, revision: generated2.revision}, notes1);
      expect.fail("Successfully set notes on a non-existant password");
    }
    catch (e)
    {
      expect(e).to.equal("no_such_password");
    }

    expect(await getNotes(generated2)).to.equal(generated2.notes);

    let pwdList = await setNotes(generated2, notes1);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      notes: notes1
    }]);

    let [origSite, site, pwdList2] = await getPasswords(generated2.site);
    expect(pwdList2).to.deep.equal(pwdList);

    expect(await getNotes(generated2)).to.equal(notes1);

    pwdList = await setNotes(generated2, notes2);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol,
      notes: notes2
    }]);

    expect(await getNotes(generated2)).to.equal(notes2);

    pwdList = await setNotes(generated2, null);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol
    }]);

    [origSite, site, pwdList2] = await getPasswords(generated2.site);
    expect(pwdList2).to.deep.equal(pwdList);

    pwdList = await setNotes(generated2, null);
    expect(pwdList).to.deep.equal([{
      type: "generated2",
      site: generated2.site,
      name: generated2.name,
      revision: generated2.revision,
      length: generated2.length,
      lower: generated2.lower,
      upper: generated2.upper,
      number: generated2.number,
      symbol: generated2.symbol
    }]);

    expect(await getNotes(generated2)).to.be.undefined;
  });

  it("should allow retrieving all passwords at once", async function()
  {
    await changePassword(dummyMaster);

    expect(await getAllPasswords()).to.deep.equal({});

    await addGenerated(generated1);
    expect(await getAllPasswords()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    await addStored(stored2);
    expect(await getAllPasswords()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          password: stored2.password,
          notes: stored2.notes
        }, {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    await addAlias("example.info", generated1.site);
    await addAlias("sub1.example.info", generated1.site);
    await addAlias("sub2.example.info", "sub." + generated2.site);
    await addGenerated(Object.assign({}, generated2, {site: "sub." + generated2.site}));
    expect(await getAllPasswords()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          password: stored2.password,
          notes: stored2.notes
        }, {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info", "sub1.example.info"]
      },
      ["sub." + generated2.site]: {
        site: "sub." + generated2.site,
        passwords: [{
          type: "generated2",
          site: "sub." + generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        }],
        aliases: ["sub2.example.info"]
      }
    });

    await setNotes(stored2, "foobarnotes");
    expect(await getAllPasswords()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          password: stored2.password,
          notes: "foobarnotes"
        }, {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info", "sub1.example.info"]
      },
      ["sub." + generated2.site]: {
        site: "sub." + generated2.site,
        passwords: [{
          type: "generated2",
          site: "sub." + generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        }],
        aliases: ["sub2.example.info"]
      }
    });

    await removePassword({site: "sub." + generated2.site, name: generated2.name, revision: generated2.revision});
    expect(await getAllPasswords()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          password: stored2.password,
          notes: "foobarnotes"
        }, {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info", "sub1.example.info"]
      }
    });
  });

  it("should export data in expected format", async function()
  {
    async function checkExport()
    {
      let exportData = await exportPasswordData();
      let parsed = JSON.parse(exportData);
      expect(parsed.application).to.equal("pfp");
      expect(parsed.format).to.equal(3);
      expect(parsed.data).to.be.an("object");
      expect(parsed.data["salt"]).to.not.be.empty;
      expect(parsed.data["hmac-secret"]).to.not.be.empty;

      await storage.clear();
      await changePassword(dummyMaster);
      await importPasswordData(exportData);
      return await getAllPasswords();
    }

    await changePassword(dummyMaster);

    expect(await checkExport()).to.deep.equal({});

    await addGenerated(generated1);
    expect(await checkExport()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    await addGenerated(generated2);
    expect(await checkExport()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "generated2",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        },
        {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: []
      }
    });

    await addAlias("example.info", generated1.site);
    await addStored(stored2);
    expect(await checkExport()).to.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          password: stored2.password,
          notes: stored2.notes
        }, {
          type: "generated2",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        }, {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["example.info"]
      }
    });

    await setNotes(generated2, "foobarnotes");
    await checkExport();
    expect(await getNotes(generated2)).to.equal("foobarnotes");
  });

  it("should import backups encrypted with the same password", async function()
  {
    await changePassword(dummyMaster);

    let salt = "asdf";
    let hmacSecret = "fdsa";
    let key = "4MgE2P1PbjLyAz7JxczGjOPNtaaqNKofAmGSbNvRtUM=";
    let iv = "fakeivwhatever";
    let cryptoPrefix = "AES-GCM!" + atob(key) + "!" + iv + "!";
    let hmacPrefix = "HMAC!" + hmacSecret + "!";
    let encrypt = data => btoa(iv) + "_" + btoa(cryptoPrefix + JSON.stringify(data));
    let digest = data => btoa(hmacPrefix + data);

    await importPasswordData(JSON.stringify({
      application: "pfp",
      format: 2,
      data: {
        salt: btoa(salt),
        "hmac-secret": encrypt(btoa(hmacSecret)),
        [`site:${digest(generated1.site)}`]: encrypt({
          site: generated1.site
        }),
        [`site:${digest(generated1.site)}:${digest(generated1.site + "\0" + generated1.name + "\0")}`]: encrypt({
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }),
        [`site:${digest(generated2.site)}:${digest(generated2.site + "\0" + generated2.name + "\0" + generated2.revision)}`]: encrypt({
          type: "generated2",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        }),
        [`site:${digest("sub." + generated1.site)}`]: encrypt({
          site: "sub." + generated1.site,
          alias: generated1.site
        })
      }
    }));

    expect(await getAllPasswords()).to.be.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "generated2",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol,
          notes: generated2.notes
        },
        {
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }],
        aliases: ["sub." + generated1.site]
      }
    });
  });

  it("should import backups encrypted with a different password", async function()
  {
    await changePassword(dummyMaster);

    let backupMaster = dummyMaster + dummyMaster;
    let salt = "asdf";
    let hmacSecret = "fdsa";
    let key = "gLrcDLgglH8KOr5bM3AhX5ARWD3ZvfKsqy76wpkDkLo=";
    let iv = "fakeivwhatever";
    let cryptoPrefix = "AES-GCM!" + atob(key) + "!" + iv + "!";
    let hmacPrefix = "HMAC!" + hmacSecret + "!";
    let encrypt = data => btoa(iv) + "_" + btoa(cryptoPrefix + JSON.stringify(data));
    let digest = data => btoa(hmacPrefix + data);

    await importPasswordData(JSON.stringify({
      application: "pfp",
      format: 3,
      data: {
        salt: btoa(salt),
        "hmac-secret": encrypt(btoa(hmacSecret)),
        [`site:${digest(generated1.site)}`]: encrypt({
          site: generated1.site
        }),
        [`site:${digest(generated1.site)}:${digest(generated1.site + "\0" + generated1.name + "\0")}`]: encrypt({
          type: "generated2",
          site: generated1.site,
          name: generated1.name,
          length: generated1.length,
          lower: generated1.lower,
          upper: generated1.upper,
          number: generated1.number,
          symbol: generated1.symbol
        }),
        [`site:${digest(generated2.site)}:${digest(generated2.site + "\0" + generated2.name + "\0" + generated2.revision)}`]: encrypt({
          type: "generated2",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          length: generated2.length,
          lower: generated2.lower,
          upper: generated2.upper,
          number: generated2.number,
          symbol: generated2.symbol
        }),
        [`site:${digest(stored2.site)}:${digest(stored2.site + "\0" + stored2.name + "\0rev2")}`]: encrypt({
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          revision: "rev2",
          password: stored2.password,
          notes: stored2.notes
        }),
        [`site:${digest("sub." + generated1.site)}`]: encrypt({
          site: "sub." + generated1.site,
          alias: generated1.site
        })
      }
    }), backupMaster);

    let generated1result = await derivePassword(Object.assign({
      masterPassword: backupMaster,
      domain: generated1.site
    }, generated1));
    let generated2result = await derivePassword(Object.assign({
      masterPassword: backupMaster,
      domain: generated2.site
    }, generated2));

    expect(await getAllPasswords()).to.be.deep.equal({
      [generated1.site]: {
        site: generated1.site,
        passwords: [{
          type: "stored",
          site: generated2.site,
          name: generated2.name,
          revision: generated2.revision,
          password: generated2result
        },
        {
          type: "stored",
          site: stored2.site,
          name: stored2.name,
          revision: "rev2",
          password: stored2.password,
          notes: stored2.notes
        },
        {
          type: "stored",
          site: generated1.site,
          name: generated1.name,
          password: generated1result
        }],
        aliases: ["sub." + generated1.site]
      }
    });
  });

  it("should import LastPass backups", async function()
  {
    function addHeader(contents)
    {
      return "url,username,password,extra,name,grouping,fav\n" + contents.replace(/\n\s+/g, "\n").trim();
    }

    await changePassword(dummyMaster);

    try
    {
      await importPasswordData(addHeader(`
        http://example.com,2,3,4,5,6,7
        http://example.com,bar
      `));
      expect.fail("Imported LastPass CSV which has the wrong number of values.");
    }
    catch (e)
    {
      expect(e).to.equal("syntax_error");
    }

    try
    {
      await importPasswordData(addHeader(`
        http://example.com,2,3,4,"5,6,7
      `));
      expect.fail("Imported LastPass CSV with dangling quote.");
    }
    catch (e)
    {
      expect(e).to.equal("syntax_error");
    }

    expect(await getAllPasswords()).to.deep.equal({});

    await importPasswordData(addHeader(`
      http://a.com,user,password,note,name,,
      http://a.com,user,another password,note,name,,
      http://a.com,user,another password,,another name,,
      http://a.com,anotheruser,password,,name44,,
      http://a.com,anotheruser,another password,,name44,,
      http://a.com,user,password,,,,
      http://a.com,user,another password,,,,
      ,user,password,note,b.com,,
      junk,user,password,note,c.com,,
      ,user,password,note,dcom,,
      ,user,password,note,e.com/path,,
      ,user,password,note,This is f.com,,
      http://f.com,,password,note,,,
      http://sn,user,password,note,g.com,,
      http://www.h.com,user,password,note,,,
      http://i.com,,,note,name,,
      http://j.com,,password,note,name,,
      http://k.com,,password,,name,,
      http://l.com,user,,,name,,
      https://m.m.com/path?query,user,password,"before""in
      side""""&amp;&lt;&gt;""after&amp;lt;",name,,
    `));

    expect(await getAllPasswords()).to.be.deep.equal({
      "a.com": {
        site: "a.com",
        passwords: [{
          site: "a.com",
          type: "stored",
          name: "anotheruser",
          revision: "name44",
          password: "password"
        }, {
          site: "a.com",
          type: "stored",
          name: "anotheruser",
          revision: "name45",
          password: "another password"
        }, {
          site: "a.com",
          type: "stored",
          name: "user",
          revision: "",
          password: "password"
        }, {
          site: "a.com",
          type: "stored",
          name: "user",
          revision: "2",
          password: "another password"
        }, {
          site: "a.com",
          type: "stored",
          name: "user",
          revision: "another name",
          password: "another password"
        }, {
          site: "a.com",
          type: "stored",
          name: "user",
          revision: "name",
          password: "password",
          notes: "note"
        }, {
          site: "a.com",
          type: "stored",
          name: "user",
          revision: "name2",
          password: "another password",
          notes: "note"
        }],
        aliases: []
      },
      "b.com": {
        site: "b.com",
        passwords: [{
          site: "b.com",
          type: "stored",
          name: "user",
          revision: "",
          password: "password",
          notes: "note"
        }],
        aliases: []
      },
      "c.com": {
        site: "c.com",
        passwords: [{
          site: "c.com",
          type: "stored",
          name: "user",
          revision: "",
          password: "password",
          notes: "note"
        }],
        aliases: []
      },
      "pfp.invalid": {
        site: "pfp.invalid",
        passwords: [{
          site: "pfp.invalid",
          type: "stored",
          name: "user",
          revision: "g.com",
          password: "password",
          notes: "note"
        }],
        aliases: []
      },
      "h.com": {
        site: "h.com",
        passwords: [{
          site: "h.com",
          type: "stored",
          name: "user",
          revision: "",
          password: "password",
          notes: "note"
        }],
        aliases: []
      },
      "i.com": {
        site: "i.com",
        passwords: [{
          site: "i.com",
          type: "stored",
          name: "name",
          revision: "",
          password: "",
          notes: "note"
        }],
        aliases: []
      },
      "j.com": {
        site: "j.com",
        passwords: [{
          site: "j.com",
          type: "stored",
          name: "name",
          revision: "",
          password: "password",
          notes: "note"
        }],
        aliases: []
      },
      "k.com": {
        site: "k.com",
        passwords: [{
          site: "k.com",
          type: "stored",
          name: "name",
          revision: "",
          password: "password"
        }],
        aliases: []
      },
      "m.m.com": {
        site: "m.m.com",
        passwords: [{
          site: "m.m.com",
          type: "stored",
          name: "user",
          revision: "name",
          password: "password",
          notes: 'before"in\nside""&<>"after&lt;'
        }],
        aliases: []
      }
    });
  });

  it("should produce expected backup import errors", async function()
  {
    try
    {
      await importPasswordData("foobar");
      expect.fail("Imported malformed JSON");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify(42));
      expect.fail("Imported non-object");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "foobar",
        format: 3,
        data: {
          salt: "asdf",
          "hmac-secret": "fdsa"
        }
      }));
      expect.fail("Imported unknown application data");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 33,
        data: {
          salt: "asdf",
          "hmac-secret": "fdsa"
        }
      }));
      expect.fail("Imported unknown format version");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: null
      }));
      expect.fail("Imported null data");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: {}
      }));
      expect.fail("Imported empty data");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: {
          salt: "asdf"
        }
      }));
      expect.fail("Imported data without HMAC secret");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: {
          "hmac-secret": "fdsa"
        }
      }));
      expect.fail("Imported data without salt");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }

    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: {
          salt: "asdf",
          "hmac-secret": "fdsa"
        }
      }));
      expect.fail("Imported data without knowing master password");
    }
    catch (e)
    {
      expect(e).to.equal("master_password_required");
    }

    await changePassword(dummyMaster);
    try
    {
      await importPasswordData(JSON.stringify({
        application: "pfp",
        format: 3,
        data: {
          salt: "asdf",
          "hmac-secret": "fakeiv_" + btoa("AES-GCM!fakekey!fakeiv!\"fdsa\"")
        }
      }));
      expect.fail("Imported data with unmatching master password");
    }
    catch (e)
    {
      expect(e).to.equal("wrong_master_password");
    }

    try
    {
      await importPasswordData("url,username,password\n");
      expect.fail("Imported LastPass CSV with incorrect header");
    }
    catch (e)
    {
      expect(e).to.equal("unknown_data_format");
    }
  });
});
