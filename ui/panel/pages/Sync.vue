<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <template v-if="$root.sync.provider">
      <div>{{ $t("provider_label") }}</div>
      <div>
        {{ labelForProvider($root.sync.provider) }}
        <template v-if="$root.sync.username">
          ({{ $root.sync.username }})
        </template>
      </div>

      <div class="block-start">{{ $t("lastTime_label") }}</div>
      <div>
        <template v-if="$root.sync.isSyncing">{{ $t("lastTime_now") }}</template>
        <template v-else-if="$root.sync.lastSync">{{ new Date($root.sync.lastSync).toLocaleString() }}</template>
        <template v-else>{{ $t("lastTime_never") }}</template>

        <template v-if="$root.sync.lastSync && !$root.sync.isSyncing">
          <span v-if="$root.sync.error" class="sync-failed">{{ " " + $t("failed") }}</span>
          <template v-else>{{ " " + $t("succeeded") }}</template>
        </template>
      </div>

      <div v-if="$root.sync.error" class="warning sync-error">
        {{ localize($root.sync.error) }}
        <a v-if="$root.sync.error == 'sync_invalid_token'" href="#" @click.prevent="authorize($root.sync.provider)">
          {{ $t("reauthorize") }}
        </a>
      </div>
      <div class="button-container">
        <button v-focus :disabled="$root.sync.isSyncing" @click="doSync">{{ $t("do_sync") }}</button>
        <button @click="disableSync">{{ $t("disable") }}</button>
      </div>
    </template>
    <template v-else>
      <div class="sync-section">{{ $t("selection_label") }}</div>
      <div v-keyboard-navigation:sync-provider-link class="sync-provider-selection">
        <a v-for="(provider, index) in providers" :key="provider.name"
           v-focus="index == 0" class="sync-provider-link"
           href="#" @click.prevent="authorize(provider.name)"
        >
          <span class="sync-provider-icon" :class="provider.name" />
          <span>{{ provider.label }}</span>
        </a>
      </div>

      <div class="block-start sync-section">{{ $t("how_heading") }}</div>
      <div class="sync-explanation">
        {{ $t("how_text") }}
        <ExternalLink type="documentation" param="sync">
          {{ $t(".learn_more") }}
        </ExternalLink>
      </div>

      <div class="block-start sync-section">{{ $t("security_heading") }}</div>
      <div class="sync-explanation">{{ $t("security_text") }}</div>

      <div class="block-start sync-section">{{ $t("no_account_heading") }}</div>
      <div class="sync-explanation">{{ $t("no_account_text") }}</div>
    </template>

    <ManualAuth v-if="manualAuthCallback"
                :callback="manualAuthCallback"
                @cancel="manualAuthCallback = null"
    />

    <RemoteStorageUsernameInput v-if="remoteStorageUsernameCallback"
                                :callback="remoteStorageUsernameCallback"
                                @cancel="remoteStorageUsernameCallback = null"
    />
  </div>
</template>

<script>
"use strict";

import {sync} from "../../proxy.js";
import ManualAuth from "../components/ManualAuth.vue";
import RemoteStorageUsernameInput from "../components/RemoteStorageUsernameInput.vue";

export default {
  name: "Sync",
  localePath: "panel/pages/Sync",
  components: {
    ManualAuth,
    RemoteStorageUsernameInput
  },
  data()
  {
    return {
      providers: [
        {
          name: "dropbox",
          label: "Dropbox"
        },
        {
          name: "gdrive",
          label: "Google Drive"
        },
        {
          name: "remotestorage",
          label: "remoteStorage"
        }
      ],
      manualAuthCallback: null,
      remoteStorageUsernameCallback: null
    };
  },
  methods:
  {
    labelForProvider(name)
    {
      for (let provider of this.providers)
        if (provider.name == name)
          return provider.label;
      return name;
    },
    localize(error)
    {
      if (/\s/.test(error))
        return error;

      return this.$t(error) || error;
    },
    doSync()
    {
      sync.sync();
    },
    disableSync()
    {
      this.$root.confirm(this.$t("disable_confirmation")).then(disable =>
      {
        if (disable)
        {
          sync.disableSync().then(() =>
          {
            this.$root.sync = {
              provider: null
            };
          });
        }
      });
    },
    authorize(provider, username)
    {
      if (provider == "remotestorage" && !username)
      {
        this.remoteStorageUsernameCallback = username => this.authorize(provider, username);
        return;
      }

      if (this.$isWebClient)
      {
        let wnd = window.open("about:blank", "_blank");
        wnd.onload = function()
        {
          wnd.document.body.textContent = "You will be redirected to the authorization page of your sync provider shortly.";
        };

        this.manualAuthCallback = code =>
        {
          return sync.manualAuthorization(provider, username, code).catch(this.$root.showUnknownError);
        };

        sync.getManualAuthURL(provider, username).then(url =>
        {
          wnd.location.href = url;
        }).catch(error =>
        {
          this.manualAuthCallback = null;
          wnd.close();
          this.$root.showUnknownError(error);
        });
      }
      else
      {
        sync.authorize(provider, username);
        window.close();
      }
    }
  }
};
</script>
