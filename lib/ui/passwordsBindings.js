"use strict";

let passwords = require("../passwords");

module.exports = function(panel)
{
  function passwordOp(func, successMessage, data)
  {
    let promise = func(data);
    promise.then(passwords => panel.port.emit(successMessage, passwords));
    promise.catch(e => {
      if (e == "alreadyExists")
        panel.port.emit("passwordAlreadyExists");
      else if (e)
        console.error(e);
    });
  }

  panel.port.on("addGeneratedPassword", passwordOp.bind(null, passwords.addGenerated, "passwordAdded"));
  panel.port.on("addLegacyPassword", passwordOp.bind(null, passwords.addLegacy, "passwordAdded"));
  panel.port.on("removePassword", passwordOp.bind(null, passwords.removePassword, "passwordRemoved"));
};
