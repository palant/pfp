/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {openAndWait} from "../ui.js";

const oauthProp = "http://tools.ietf.org/html/rfc6749#section-4.2";
const clientId = "http://localhost:37602/";
const clientIdManual = "https://pfp.works";
const scope = "pfp";
const redirectUri = "http://localhost:37602/";
const redirectUriManual = "https://pfp.works/oauth-endpoint/";

let accountCache = new Map();

function accountInfo(username)
{
  if (accountCache.has(username))
    return Promise.resolve(accountCache.get(username));

  let host = username.substr(username.indexOf("@") + 1);
  let url = `https://${host}/.well-known/webfinger?resource=${encodeURIComponent("acct:" + username)}`;
  return fetch(url).then(response =>
  {
    return response.json();
  }).then(response =>
  {
    if (!Array.isArray(response.links))
      throw "sync_malformed_response";

    let link = null;
    for (let l of response.links)
      if (l.rel == "http://tools.ietf.org/id/draft-dejong-remotestorage")
        link = l;

    if (!link || typeof link.href != "string" || !link.href)
      throw "sync_malformed_response";

    if (typeof link.properties != "object" || !link.properties || typeof link.properties[oauthProp] != "string" || !link.properties[oauthProp])
      throw "sync_malformed_response";

    accountCache.set(username, {
      auth: link.properties[oauthProp],
      base: link.href
    });
    return accountCache.get(username);
  });
}

function addQuery(url, params)
{
  let query = [];
  for (let key of Object.keys(params))
    query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));

  return url +  (url.includes("?") ? "&" : "?") + query.join("&");
}

function joinPaths(url, ...parts)
{
  for (let part of parts)
  {
    url = url.replace(/\/+$/, "");
    part = part.replace(/^\/+/, "");
    url += "/" + part;
  }
  return url;
}

export function authorize(username)
{
  return accountInfo(username).then(endpoints =>
  {
    let url = addQuery(endpoints.auth, {
      response_type: "token",
      client_id: clientId,
      scope: scope + ":rw",
      redirect_uri: redirectUri
    });
    return openAndWait(url, redirectUri);
  }).then(url =>
  {
    let hash = new URL(url).hash;
    if (!hash)
      throw "sync_malformed_response";

    let response = {};
    for (let pair of hash.substr(1).split("&"))
    {
      let [key, value] = pair.split("=", 2).map(s => decodeURIComponent(s));
      response[key] = value;
    }

    if (!response.access_token)
      throw "sync_malformed_response";

    return response.access_token;
  });
}

export function getManualAuthURL(username)
{
  return accountInfo(username).then(endpoints =>
  {
    return addQuery(endpoints.auth, {
      response_type: "token",
      scope: scope + ":rw",
      client_id: clientIdManual,
      redirect_uri: redirectUriManual
    });
  });
}

export function processAuthCode(code)
{
  return Promise.resolve(code);
}

export function get(path, token, username)
{
  return accountInfo(username).then(endpoints =>
  {
    return fetch(joinPaths(endpoints.base, scope, path), {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
  }).then(response =>
  {
    if (response.status == 401 || response.status == 403)
      throw "sync_invalid_token";
    else if (response.status == 404)
      throw "not_found";
    else if (response.status != 200)
      throw new Error(`Unexpected server response: ${response.status} ${response.statusText}`);

    let revision = response.headers.get("ETag");
    if (!revision)
      throw "sync_malformed_response";
    return Promise.all([revision, response.text()]);
  }).then(([revision, contents]) =>
  {
    return {
      revision,
      contents
    };
  }).catch(error =>
  {
    if (error == "not_found")
      return null;
    else
      throw error;
  });
}

export function put(path, contents, replaceRevision, token, username)
{
  return accountInfo(username).then(endpoints =>
  {
    let headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/octet-stream"
    };

    if (replaceRevision)
      headers["If-Match"] = replaceRevision;
    else
      headers["If-None-Match"] = "*";

    return fetch(joinPaths(endpoints.base, scope, path), {
      method: "PUT",
      headers,
      body: contents
    });
  }).then(response =>
  {
    if (response.status == 401 || response.status == 403)
      throw "sync_invalid_token";
    else if (response.status == 412)
      throw "sync_wrong_revision";
    else if (response.status != 200 && response.status != 201)
      throw new Error(`Unexpected server response: ${response.status} ${response.statusText}`);
  });
}
