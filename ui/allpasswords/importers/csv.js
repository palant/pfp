/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

class Stream
{
  constructor(data)
  {
    this.data = data;
    this.position = 0;
  }

  done()
  {
    return this.position >= this.data.length;
  }

  peek()
  {
    return this.data[this.position];
  }

  skip()
  {
    return this.position++;
  }

  readTo(list)
  {
    let index = this.data.length;
    for (let str of list)
    {
      let index2 = this.data.indexOf(str, this.position);
      if (index2 >= 0 && index2 < index)
        index = index2;
    }

    let result = this.data.slice(this.position, index);
    this.position = index;
    return result;
  }
}

function findInArray(array, values)
{
  for (let i = 0; i < array.length; i++)
    if (values.includes(array[i].toLowerCase()))
      return i;
  return -1;
}

function parseEntry(stream)
{
  let values = [];
  for (;;)
  {
    let quoted = stream.peek() == "\"";
    if (quoted)
    {
      stream.skip();

      let currentValue = "";
      for (;;)
      {
        currentValue += stream.readTo(["\""]);
        if (stream.peek() == "\"")
          stream.skip();
        else
        {
          console.error(new Error("Syntax error, unterminated quoted value"));
          throw "syntax_error";
        }

        if (stream.peek() == "\"")
          currentValue += "\"";
        else
          break;
      }
      values.push(currentValue);
    }
    else
      values.push(stream.readTo([",", "\n"]));

    if (stream.done())
      return values;
    if (stream.peek() == "\n")
    {
      stream.skip();
      return values;
    }

    if (stream.peek() == ",")
      stream.skip();
    else
    {
      console.error(new Error("Syntax error, quoted value not followed by a comma"));
      throw "syntax_error";
    }
  }
}

function getHostname(url)
{
  if (!/^\w+:/.test(url))
    url = "https://" + url;

  try
  {
    let hostname = new URL(url).hostname;

    const PREFIX = "www.";
    if (hostname.startsWith(PREFIX))
      hostname = hostname.slice(PREFIX.length);

    if (hostname == "sn")
    {
      // This is a secure note, not associated with any website
      return "";
    }

    return hostname;
  }
  catch (e)
  {
    return "";
  }
}

export default function(data)
{
  let stream = new Stream(data.trim().replace(/\r/g, ""));
  let headerFields = parseEntry(stream);

  let titleIndex = findInArray(headerFields, ["title", "name"]);
  let usernameIndex = findInArray(headerFields, ["username", "user", "login"]);
  let passwordIndex = findInArray(headerFields, ["password", "pass"]);
  let urlIndex = findInArray(headerFields, ["url", "website"]);
  let hostnameIndex = findInArray(headerFields, ["host", "hostname"]);
  let notesIndex = findInArray(headerFields, ["notes", "extra"]);
  if ((titleIndex < 0 && usernameIndex < 0) || passwordIndex < 0 || (urlIndex < 0 && hostnameIndex < 0))
    throw "unknown_data_format";

  let entries = [];
  while (!stream.done())
  {
    let values = parseEntry(stream);
    if (values.length != headerFields.length)
    {
      console.error(
        new Error("Syntax error, unexpected number of values in a line\n" +
                  JSON.stringify(values))
      );
      throw "syntax_error";
    }

    let title = titleIndex >= 0 ? values[titleIndex] : values[usernameIndex];
    let username = usernameIndex >= 0 ? values[usernameIndex] : values[titleIndex];
    let password = values[passwordIndex];
    let hostname = getHostname(urlIndex >= 0 ? values[urlIndex] : values[hostnameIndex]);
    let notes = notesIndex >= 0 ? values[notesIndex] : null;
    entries.push({
      title,
      username,
      password,
      hostname,
      notes
    });
  }

  return {
    entries,
    aliases: {}
  };
}
