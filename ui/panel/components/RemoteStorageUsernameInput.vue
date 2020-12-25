<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="done">
      <label for="username">{{ $t("username_label") }}</label>
      <validated-input id="username" v-model="username"
                       v-model:error="usernameError" v-focus
                       placeholder="me@example.com"
                       @validate="validateUsername"
      />
      <div v-if="usernameError" class="error">
        {{ usernameError }}
      </div>

      <div class="remoteStorage-hosting-link">
        <external-link type="url" param="https://wiki.remotestorage.io/Servers">
          {{ $t("get_account") }}
        </external-link>
      </div>

      <div class="button-container">
        <button type="submit">{{ $t("/ok") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

export default {
  name: "RemoteStorageUsernameInput",
  localePath: "panel/components/RemoteStorageUsernameInput",
  props: {
    target: {
      type: String,
      required: true
    },
    callback: {
      type: Function,
      required: true
    }
  },
  emits: ["cancel"],
  data()
  {
    return {
      username: "",
      usernameError: null
    };
  },
  methods: {
    done()
    {
      this.$emit("cancel");
      if (this.callback && this.username)
        this.callback(this.username);
    },
    validateUsername(value, setError)
    {
      let index = value.indexOf("@");
      if (index <= 0 || /\s/.test(value))
        setError(this.$t("invalid_username"));
      else
      {
        let host = value.substr(index + 1).toLowerCase();

        // URL object will always encode non-ASCII characters, yet all of them
        // are valid. Replace by ASCII letters for validation.
        host = host.replace(/[\u0080-\uFFFF]/g, "a");
        try
        {
          if (new URL("https://" + host + "/").hostname != host)
            throw "invalid";
        }
        catch (e)
        {
          setError(this.$t("invalid_username"));
        }
      }
    }
  }
};
</script>
