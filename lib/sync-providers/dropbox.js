/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let tabs = require("tabs");

let baseUri = "https://www.dropbox.com/1/oauth2/";
let clientId = "mah5dtksdflznfc";
let redirectUri = "https://0.0.0.0/";

function getEndPoint(name, params)
{
  let result = baseUri + name;
  if (params)
  {
    let query = [];
    for (let key of Object.keys(params))
      query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    result = result + "?" + query.join("&");
  }
  return result;
}

exports.authorize = function()
{
  let url = getEndPoint("authorize", {
    response_type: "token",
    client_id: clientId,
    redirect_uri: redirectUri
  });

  return tabs.openAndWait(url, redirectUri).then(url =>
  {
    let hash = new URL(url).hash;
    if (!hash)
      throw "malformed-response";

    let response = {};
    for (let pair of hash.substr(1).split("&"))
    {
      let [key, value] = pair.split("=", 2).map(s => decodeURIComponent(s));
      response[key] = value;
    }

    if (response.token_type != "bearer" || !response.access_token)
      throw "malformed-response";

    return response.access_token;
  });
};
