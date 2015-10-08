"use strict";

// Let the script inside the page do the work. No, we cannot do it ourselves,
// https://bugzilla.mozilla.org/show_bug.cgi?id=1198934 won't let us.

self.port.on("derivePassword", function(message)
{
  let {responseMessage, params} = message;

  unsafeWindow.derivePassword(
    cloneInto(params, unsafeWindow),
    exportFunction(result => self.port.emit(responseMessage, result), unsafeWindow)
  );
});

self.port.on("encryptPassword", function(message)
{
  let {responseMessage, params} = message;

  unsafeWindow.encryptPassword(
    cloneInto(params, unsafeWindow),
    exportFunction(result => self.port.emit(responseMessage, result), unsafeWindow)
  );
});

self.port.on("decryptPassword", function(message)
{
  let {responseMessage, params} = message;

  unsafeWindow.decryptPassword(
    cloneInto(params, unsafeWindow),
    exportFunction(result => self.port.emit(responseMessage, result), unsafeWindow)
  );
});
