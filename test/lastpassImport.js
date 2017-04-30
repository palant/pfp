/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {header, parseCSV, parseLastpassCSV} = require("../lib/lastpassImport");
let masterPassword = require("../lib/masterPassword");

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

  // FIXME - These tests fail since the encrypted data seems to change each
  //         time the tests are run. Why?!
  parseLastpassCSV(genCSV(simpleValues)).then(
    data =>
    {
      test.deepEqual(
        data, {
          application: "easypasswords",
          format: 1,
          sites: {
            "foo.example.com": {
              passwords: {
                user: {
                  name: "Foo",
                  notes: "FR/lSIIUBYdaxuNb0uYBAw==_0MubqUvaqlxTKCWWT/auAA==",
                  type: "stored",
                  password: "nGajA3CaJK+LOkpjsrIHhg==_3b8cYoBcXXgtD5rv9IeRdg=="
                },
                anotheruser: {
                  name: "foo",
                  notes: "mjFWoUUXzjgdfIglC61Txw==_mYCwntXPsQ3WSmKohhOdew=="
                }
              }
            },
            "easypasswords.invalid": {
              passwords: {
                u: {
                  name: "name",
                  type: "stored",
                  password: "PXdLdRF+nAX/7zrFG8FwiQ==_XmDYrTxbTYNEOdOrOpxblw=="
                }
              }
            }
          }
        },
        "Correct structure produced from simple CSV"
      );

      return parseLastpassCSV("\n   \n" + genCSV(trickyValues) + "    ");
    }
  ).then(
    data =>
    {
      test.deepEqual(
        data, {
          application: "easypasswords",
          format: 1,
          sites: {
            "example.com": {
              passwords: {
                "&\n": {
                  name: " ",
                  notes: "Z3OP83j1tVhqIGNmEdcH9Q==_WzE7WoD0gG+UaOj6iTZdLw==",
                  type: "stored",
                  password: "WKK5Yk7rVP3jvhXGi1HHOg==_4XulrotryD3aKdHltBp2+Q=="
                }
              }
            }
          }
        },
        "Correct structure produced from tricky CSV"
      );
    }
  ).then(test.done);
};
