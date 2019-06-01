<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="page">
    <template v-if="$app.sync.provider">
      <div>{{ $t("sync_provider") }}</div>
      <div>
        {{ labelForProvider($app.sync.provider) }}
        <template v-if="$app.sync.username">
          ({{ $app.sync.username }})
        </template>
      </div>

      <div class="block-start">{{ $t("sync_lastTime") }}</div>
      <div>
        <template v-if="$app.sync.isSyncing">{{ $t("sync_lastTime_now") }}</template>
        <template v-else-if="$app.sync.lastSync">{{ new Date($app.sync.lastSync).toLocaleString() }}</template>
        <template v-else>{{ $t("sync_lastTime_never") }}</template>

        <template v-if="$app.sync.lastSync && !$app.sync.isSyncing">
          <span v-if="$app.sync.error" class="sync-failed">{{ " " + $t("sync_failed") }}</span>
          <template v-else>{{ " " + $t("sync_succeeded") }}</template>
        </template>
      </div>

      <div v-if="$app.sync.error" class="warning sync-error">
        {{ localize($app.sync.error) }}
        <a v-if="$app.sync.error == 'sync_invalid_token'" href="#" @click.prevent="authorize($app.sync.provider)">
          {{ $t("sync_reauthorize") }}
        </a>
      </div>
      <div class="button-container">
        <button v-focus :disabled="$app.sync.isSyncing" @click="doSync">{{ $t("do_sync") }}</button>
        <button @click="disableSync">{{ $t("sync_disable") }}</button>
      </div>
    </template>
    <template v-else>
      <div class="sync-section">{{ $t("sync_selection_label") }}</div>
      <div class="sync-provider-selection">
        <a v-for="(provider, index) in providers" :key="provider.name"
           v-focus="index == 0" class="sync-provider-link"
           href="#" @click.prevent="authorize(provider.name)"
        >
          <span class="sync-provider-icon" :class="provider.name" />
          <span>{{ provider.label }}</span>
        </a>
      </div>

      <div class="block-start sync-section">{{ $t("sync_how_label") }}</div>
      <div class="sync-explanation">
        {{ $t("sync_how_explanation") }}
        <external-link type="documentation" param="sync">
          {{ $t("learn_more") }}
        </external-link>
      </div>

      <div class="block-start sync-section">{{ $t("sync_safe_label") }}</div>
      <div class="sync-explanation">{{ $t("sync_safe_explanation") }}</div>

      <div class="block-start sync-section">{{ $t("sync_no_account_label") }}</div>
      <div class="sync-explanation">{{ $t("sync_no_account_explanation") }}</div>
    </template>

    <manual-auth v-if="manualAuthCallback"
                 :callback="manualAuthCallback"
                 @cancel="manualAuthCallback = null"
    />

    <remoteStorage-username-input v-if="remoteStorageUsernameCallback"
                                  :callback="remoteStorageUsernameCallback"
                                  @cancel="remoteStorageUsernameCallback = null"
    />
  </div>
</template>

<script>
"use strict";

import {sync} from "../../proxy";
import ManualAuth from "../components/ManualAuth.vue";
import RemoteStorageUsernameInput from "../components/RemoteStorageUsernameInput.vue";

export default {
  name: "Sync",
  components: {
    "manual-auth": ManualAuth,
    "remoteStorage-username-input": RemoteStorageUsernameInput
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
      this.$app.confirm(this.$t("sync_disable_confirmation")).then(disable =>
      {
        if (disable)
        {
          sync.disable().then(() =>
          {
            this.$app.sync = {
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
          return sync.manualAuthorization(provider, username, code).catch(this.$app.showUnknownError);
        };

        sync.getManualAuthURL(provider, username).then(url =>
        {
          wnd.location.href = url;
        }).catch(error =>
        {
          this.manualAuthCallback = null;
          wnd.close();
          this.$app.showUnknownError(error);
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
