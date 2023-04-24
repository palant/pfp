import {port} from "../lib/messaging.js";

export function getKeys()
{
  return new Promise(resolve =>
  {
    let callback = keys =>
    {
      port.off("keys", callback);
      resolve(keys);
    };

    port.on("keys", callback);
    port.emit("getKeys");
  });
}

export function rememberKeys(keys)
{
  port.emit("setKeys", keys);
}

export function forgetKeys()
{
  rememberKeys(null);
}
