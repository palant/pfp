/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import {openAndWait} from "../ui.js";

const endpoints = {
  "auth": "https://accounts.google.com/o/oauth2/v2/auth",
  "token": "https://www.googleapis.com/oauth2/v4/token",
  "files": "https://www.googleapis.com/drive/v2/files",
  "upload": "https://www.googleapis.com/upload/drive/v2/files"
};
const clientId = "413724158571-0d0fqalv9vupfvhd5oo2j7q6ti2jr8vq.apps.googleusercontent.com";
const redirectUri = "http://localhost:37602/";
const redirectUriManual = "urn:ietf:wg:oauth:2.0:oob";

function getEndPoint(name, params)
{
  let result = endpoints[name];
  if (params)
  {
    let query = [];
    for (let key of Object.keys(params))
      query.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    result = result + "?" + query.join("&");
  }
  return result;
}

async function handleError(response)
{
  let data = await response.text();
  let parsed, code;
  try
  {
    parsed = JSON.parse(data);
    code = parsed.error;
    if (typeof code == "object")
      code = code.errors.map(e => e.reason).join("/");
  }
  catch (e)
  {
    throw new Error(`Unexpected server response: ${response.status} ${response.statusText}`);
  }

  if (code == "authError" || code == "invalid_grant")
    throw "sync_invalid_token";
  else if (code == "conditionNotMet")
    throw "sync_wrong_revision";
  else
  {
    let message = parsed.error;
    if (typeof message == "object")
      message = message.errors.map(e => e.message).join(", ");
    throw new Error(`Unexpected server error: ${message}`);
  }
}

async function getAccessToken(refreshToken)
{
  let params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("grant_type", "refresh_token");
  let response = await fetch(getEndPoint("token"), {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  if (!response.ok)
    await handleError(response);

  let data = await response.json();
  if (!data.access_token)
    throw "sync_malformed_response";

  return data.access_token;
}

export async function authorize()
{
  let url = getEndPoint("auth", {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "https://www.googleapis.com/auth/drive.appdata",
    access_type: "offline"
  });

  url = await openAndWait(url, redirectUri);
  let params = new URL(url).search;
  if (!params)
    throw "sync_malformed_response";

  let response = {};
  for (let pair of params.substr(1).split("&"))
  {
    let [key, value] = pair.split("=", 2).map(s => decodeURIComponent(s));
    response[key] = value;
  }

  if (!response.code)
    throw "sync_malformed_response";

  return await processAuthCode(response.code, redirectUri);
}

export async function getManualAuthURL()
{
  return getEndPoint("auth", {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUriManual,
    scope: "https://www.googleapis.com/auth/drive.appdata",
    access_type: "offline"
  });
}

export async function processAuthCode(code, redirectUri)
{
  let params = new URLSearchParams();
  params.append("code", code);
  params.append("client_id", clientId);
  params.append("redirect_uri", redirectUri || redirectUriManual);
  params.append("grant_type", "authorization_code");
  let response = await fetch(getEndPoint("token"), {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  if (!response.ok)
    await handleError(response);

  let data = await response.json();
  if (!data.refresh_token)
    throw "sync_malformed_response";

  return data.refresh_token;
}

export async function get(path, token)
{
  if (path.startsWith("/"))
    path = path.substr(1);

  let accessToken = await getAccessToken(token);
  let url = getEndPoint("files", {
    q: `title='${path}' and 'appdata' in parents`
  });
  let response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok)
    await handleError(response);

  let data = await response.json();
  let files = data.items.filter(file => file.appDataContents && !file.labels.trashed);
  if (files.length == 0)
    return null;

  if (files.length != 1)
    throw "sync_multiple_candidates";

  let file = files[0];
  url = `${getEndPoint("files")}/${file.id}?alt=media`;
  response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok)
    await handleError(response);

  let contents = await response.text();
  return {revision: [file.id, file.etag], contents};
}

export async function put(path, contents, replaceRevision, token)
{
  if (path.startsWith("/"))
    path = path.substr(1);

  let accessToken = await getAccessToken(token);
  if (replaceRevision)
  {
    let [id, etag] = replaceRevision;
    let url = `${getEndPoint("upload")}/${id}?uploadType=media`;
    let response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "If-Match": etag
      },
      body: contents
    });
    if (!response.ok)
      await handleError(response);
  }
  else
  {
    let url = getEndPoint("upload", {
      uploadType: "multipart"
    });

    let data = new FormData();
    data.append("metadata", new Blob([JSON.stringify({
      title: path,
      parents: [{id: "appdata"}]
    })], {type: "application/json"}));
    data.append("media", new Blob([contents], {type: "application/octet-stream"}));

    let response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: data
    });
    if (!response.ok)
      await handleError(response);
  }
}
