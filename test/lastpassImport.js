/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {header, parseLastpassCSV} = require("../lib/lastpassImport");

function genCSV(entries)
{
  return header + "\n" + entries.map(entry => entry.join(",")).join("\n");
}

exports.testParseLastpassCSV = function(test)
{
  test.equal(
    parseLastpassCSV("foobar"),
    null,
    "Return null if not Lastpass CSV"
  );

  test.throws(
    () => parseLastpassCSV(genCSV([["http://example.com", 2, 3, 4, 5, 6, 7],
                                   ["http://example.com", "bar"]])),
    // FIXME - Nodeunit doesn't seem to actually check the message is correct!
    "Line 3: Wrong number of values for entry. Saw 2, but expected 7.",
    "Entries with wrong number of fields cause exception"
  );

  test.throws(
    () => parseLastpassCSV(genCSV(["http://example.com", 2, 3, 4, "\"5", 6, 7])),
    "Syntax error, quotation mark was opened but never closed!",
    "Entry with unballanced quote causes an exception"
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

  test.deepEqual(
    parseLastpassCSV(genCSV([
      ["foo.example.com", "user", "password", "\"some\nnotes\nyada\"", "Foo", "", ""],
      ["http://foo.example.com/bar?hello", "anotheruser", "", "Notes", "foo", "", ""],
      ["", "u", "secret123", "", "name", "", ""]
    ])), {
      application: "easypasswords",
      format: 1,
      sites: {
        "foo.example.com": {
          user: {
            name: "Foo",
            type: "stored",
            password: "password",
            notes: "some\nnotes\nyada"
          },
          anotheruser: {
            name: "foo",
            notes: "Notes"
          }
        },
        "easypasswords.invalid": {
          u: {
            name: "name",
            type: "stored",
            password: "secret123"
          }
        }
      }
    },
    "Well formed CSV is parsed properly"
  );

  test.deepEqual(
    parseLastpassCSV(
      "\n   \n" + genCSV([
        ["http://example.com", "\"&amp;\n\"", "\",\"", "\"\"\"\"", " ", "", ""]
      ]) + "    "
    ), {
      application: "easypasswords",
      format: 1,
      sites: {
        "example.com": {
          "&\n": {
            name: " ",
            type: "stored",
            password: ",",
            notes: "\""
          }
        }
      }
    },
    "Tricky CSV is parsed properly"
  );

  test.done();
};
