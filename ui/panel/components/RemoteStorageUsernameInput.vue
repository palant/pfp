<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <modal-overlay @cancel="$emit('cancel')">
    <validated-form class="modal-form" @validated="done">
      <label for="username">{{ $t("remoteStorage_username_label") }}</label>
      <validated-input id="username" v-model.trim="username" v-focus placeholder="me@example.com" @validate="validateUsername" />
      <div v-if="username.error" class="error">
        {{ username.error }}
      </div>

      <div class="remoteStorage-hosting-link">
        <external-link type="url" param="https://wiki.remotestorage.io/Servers">
          {{ $t("remoteStorage_get_account") }}
        </external-link>
      </div>

      <div class="button-container">
        <button type="submit">{{ $t("ok") }}</button>
      </div>
    </validated-form>
  </modal-overlay>
</template>

<script>
"use strict";

export default {
  name: "ManualAuth",
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
  data()
  {
    return {
      username: {value: ""}
    };
  },
  methods: {
    done()
    {
      this.$emit("cancel");
      if (this.callback && this.username.value)
        this.callback(this.username.value);
    },
    validateUsername(newData)
    {
      let index = newData.value.indexOf("@");
      if (index <= 0 || /\s/.test(newData.value))
        newData.error = this.$t("remoteStorage_invalid_username");
      else
      {
        let host = newData.value.substr(index + 1).toLowerCase();

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
          newData.error = this.$t("remoteStorage_invalid_username");
        }
      }
    }
  }
};
</script>
