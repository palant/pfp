/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let {passwords} = require("../proxy");
let {setSubmitHandler} = require("./events");
let state = require("./state");
let {$, showUnknownError} = require("./utils");

function checkMigrationStatus()
{
  if (state.masterPasswordState != "migrating")
    return;

  passwords.isMigrating().then(migrating =>
  {
    if (migrating)
      window.setTimeout(checkMigrationStatus, 100);
    else
    {
      $("migration-in-progress").hidden = true;
      $("migration-buttons").hidden = false;
      $("migration-continue").focus();
    }
  }).catch(e =>
  {
    window.setTimeout(checkMigrationStatus, 100);
  });
}

state.on("update", checkMigrationStatus);

setSubmitHandler("migration", () =>
{
  passwords.getPasswords(state.origSite)
    .then(([origSite, site, pwdList]) =>
    {
      state.set({origSite, site, pwdList, masterPasswordState: "known"});
    }).catch(error =>
    {
      showUnknownError(error);
    });
});
