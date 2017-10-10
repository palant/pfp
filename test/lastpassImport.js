/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {header, parseCSV, parseLastpassCSV} = require("../lib/lastpassImport");
let masterPassword = require("../lib/masterPassword");
const {decryptPassword} = require("../lib/crypto");

let dummyMaster = "foobar";

function genCSV(entries)
{
  return header + "\n" + entries.map(entry => entry.join(",")).join("\n");
}

let simpleValues = [
  ["foo.example.com", "user", "password", "\"some\nnotes\nyada\"", "Foo", "", ""],
  ["http://foo.example.com/bar?hello", "anotheruser", "", "Notes", "foo", "", ""],
  ["", "u", "secret123", "", "name", "", ""]
];
let trickyValues = [
  ["http://example.com", "\"&amp;\n\"", "\",\"", "\"\"\"\"", " ", "", ""]
];

function stripQuotes(values)
{
  values = values.slice();
  for (let i = 0; i < values.length; i++)
  {
    values[i] = values[i].map(value =>
    {
      if (value[0] == "\"" && value[value.length - 1] == "\"")
        return value.substr(1, value.length - 2).replace(/""/g, "\"");
      return value;
    });
  }
  return values;
}

function decryptEqual(test, params, encrypted, expected)
{
  params.masterPassword = masterPassword.get();
  params.encrypted = encrypted;
  return decryptPassword(params).then(decrypted =>
  {
    test.equal(decrypted, expected);
  });
}

exports.setUp = function(callback)
{
  masterPassword.changePassword(dummyMaster).then(callback);
};

exports.tearDown = function(callback)
{
  masterPassword.forgetPassword().then(callback);
};

exports.testParseCSV = function(test)
{
  test.throws(
    () => parseCSV(genCSV([["http://example.com", 2, 3, 4, 5, 6, 7],
                           ["http://example.com", "bar"]])),
    // FIXME - Nodeunit doesn't seem to actually check the message is correct!
    "Line 3: Wrong number of values for entry. Saw 2, but expected 7.",
    "Entries with wrong number of fields cause exception"
  );

  test.throws(
    () => parseCSV(genCSV(["http://example.com", 2, 3, 4, "\"5", 6, 7])),
    "Syntax error, quotation mark was opened but never closed!",
    "Entry with unballanced quote causes an exception"
  );

  test.deepEqual(parseCSV(genCSV(simpleValues)).slice(1),
                 stripQuotes(simpleValues),
                 "Well formed CSV is parsed properly");

  test.deepEqual(parseCSV("\n   \n" + genCSV(trickyValues) + "    ").slice(1),
                 stripQuotes(trickyValues),
                 "Tricky CSV is parsed properly");

  test.done();
};

exports.testParseLastpassCSV = function(test)
{
  test.equal(
    parseLastpassCSV("foobar"),
    null,
    "Return null if not Lastpass CSV"
  );

  test.throws(
    () => parseLastpassCSV(genCSV[["http://example.com", "", "", "", "", "", ""]]),
    "One or more entries have an empty name, which Lastpass doesn't allow.",
    "Entry with no name causes an exception"
  );

  test.throws(
    () => parseLastpassCSV(genCSV(["http://example.com", 2, 3, 4, 5, 6, 7],
                                  ["http://example.com/test", 2, 3, 4, 5, 6, 7])),
    "Multiple records for domain: example.com, user: 2",
    "Duplicate entries for domain + user combination causes an exception"
  );

  parseLastpassCSV(genCSV(simpleValues)).then(
    data =>
    {
      test.equal(data.application, "easypasswords");
      test.equal(data.format, 1);
      test.deepEqual(
        Object.getOwnPropertyNames(data.sites),
        ["foo.example.com", "easypasswords.invalid"]
      );
      test.deepEqual(
        Object.getOwnPropertyNames(data.sites["foo.example.com"].passwords),
        ["user", "anotheruser"]
      );
      test.deepEqual(
        Object.getOwnPropertyNames(data.sites["easypasswords.invalid"].passwords),
        ["u"]
      );
      test.equal(data.sites["foo.example.com"].passwords["user"].name, "Foo");
      test.equal(data.sites["foo.example.com"].passwords["user"].type, "stored");
      test.equal(data.sites["foo.example.com"].passwords["anotheruser"].name, "foo");
      test.equal(data.sites["easypasswords.invalid"].passwords["u"].name, "name");
      test.equal(data.sites["easypasswords.invalid"].passwords["u"].type, "stored");

      return Promise.all([
        decryptEqual(
          test,
          {domain: "foo.example.com", name: "user\0\0notes"},
          data.sites["foo.example.com"].passwords["user"].notes,
          "some\nnotes\nyada"
        ),
        decryptEqual(
          test,
          {domain: "foo.example.com", name: "user"},
          data.sites["foo.example.com"].passwords["user"].password,
          "password"
        ),
        decryptEqual(
          test,
          {domain: "foo.example.com", name: "anotheruser\0\0notes"},
          data.sites["foo.example.com"].passwords["anotheruser"].notes,
          "Notes"
        ),
        decryptEqual(
          test,
          {domain: "easypasswords.invalid", name: "u"},
          data.sites["easypasswords.invalid"].passwords["u"].password,
          "secret123"
        )
      ]);
    }
  ).then(() => parseLastpassCSV("\n   \n" + genCSV(trickyValues) + "    ")).then(
    data =>
    {
      test.equal(data.application, "easypasswords");
      test.equal(data.format, 1);
      test.deepEqual(
        Object.getOwnPropertyNames(data.sites),
        ["example.com"]
      );
      test.deepEqual(
        Object.getOwnPropertyNames(data.sites["example.com"].passwords),
        ["&\n"]
      );
      test.equal(data.sites["example.com"].passwords["&\n"].name, " ");
      test.equal(data.sites["example.com"].passwords["&\n"].type, "stored");

      return Promise.all([
        decryptEqual(
          test,
          {domain: "example.com", name: "&\n\0\0notes"},
          data.sites["example.com"].passwords["&\n"].notes,
          "\""
        ),
        decryptEqual(
          test,
          {domain: "example.com", name: "&\n"},
          data.sites["example.com"].passwords["&\n"].password,
          ","
        )
      ]);
    }
  ).then(() =>
  {
    test.done();
  });
};
