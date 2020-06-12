/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

const dummyToken = String(Math.random()).substr(2);

let files = {};

export function authorize()
{
  return Promise.resolve(dummyToken);
}

export function get(path, token)
{
  if (token != dummyToken)
    return Promise.reject("sync_invalid_token");

  if (!path.startsWith("/"))
    return Promise.reject("sync_invalid_path");

  return Promise.resolve(files.hasOwnProperty(path) ? files[path] : null).then(result =>
  {
    if (result)
      result = Object.assign({}, result);
    if (result && provider.changeRevisionOnGet > 0)
    {
      files[path].revision++;
      provider.changeRevisionOnGet--;
    }
    return result;
  });
}

export function put(path, contents, replaceRevision, token)
{
  if (token != dummyToken)
    return Promise.reject("sync_invalid_token");

  if (!path.startsWith("/"))
    return Promise.reject("sync_invalid_path");

  let currentRevision = files.hasOwnProperty(path) ? files[path].revision : null;
  if (currentRevision !== replaceRevision)
    return Promise.reject("sync_wrong_revision");

  let revision = currentRevision ? String(parseInt(currentRevision, 10) + 1) : "1";
  return Promise.resolve().then(() =>
  {
    files[path] = {revision, contents};
  });
}

let provider = {
  changeRevisionOnGet: 0,
  _get(path)
  {
    return files[path];
  },
  _set(path, revision, contents)
  {
    files[path] = {revision, contents};
  },
  _reset()
  {
    files = {};
    provider.changeRevisionOnGet = 0;
  },
  authorize,
  get,
  put
};

export default provider;
