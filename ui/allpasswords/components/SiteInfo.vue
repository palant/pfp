<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="site-container">
    <div class="site-name">
      <a v-if="$isWebClient" href="#" @click.prevent="goToSite">{{ displayName }}</a>
      <template v-else>{{ displayName }}</template>
    </div>

    <div v-if="site.aliases.length">
      {{ $t("aliases_label") }}
      {{ site.aliases.slice().sort().join(", ") }}
    </div>

    <PasswordInfo
      v-for="password in site.passwords" :key="password.name"
      ref="password" :password="password"
      :site-display-name="displayName" :show-notes="showNotes"
      :show-passwords="showPasswords"
      @removed="removePassword(password)"
    />
  </div>
</template>

<script>
"use strict";

import {getSiteDisplayName} from "../../common.js";
import {passwords} from "../../proxy.js";
import PasswordInfo from "./PasswordInfo.vue";

export default {
  name: "SiteInfo",
  localePath: "allpasswords/components/SiteInfo",
  components: {
    PasswordInfo
  },
  props: {
    site: {
      type: Object,
      required: true
    },
    showNotes: {
      type: Boolean,
      required: true
    },
    showPasswords: {
      type: Boolean,
      required: true
    }
  },
  emits: ["removed"],
  computed: {
    displayName()
    {
      return getSiteDisplayName(this.site.site);
    }
  },
  methods:
  {
    goToSite()
    {
      window.dispatchEvent(new CustomEvent("show-panel", {
        detail: this.site.site
      }));
    },
    removePassword(password)
    {
      let passwords = this.site.passwords;
      let index = passwords.indexOf(password);
      if (index >= 0)
        passwords.splice(index, 1);
      if (!passwords.length)
        this.$emit("removed");
    },
    activate()
    {
      this.$el.scrollIntoView(true);
      this.$refs.password.activate();
    }
  }
};
</script>
