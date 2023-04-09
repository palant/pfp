<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="list">
    <Shortcuts :letters="getLetters(sites)" @clicked="scrollToSite" />

    <SiteInfo
      v-for="site in sites" :key="site.site"
      :ref="'site.' + site.site" :site="site" :show-notes="showNotes"
      :show-passwords="showPasswords" :recovery-code-params="recoveryCodeParams"
      @removed="removeSite(site)"
    />
  </div>
</template>

<script>
"use strict";

import {getSiteDisplayName, handleErrors} from "../../common.js";
import {nativeRequest} from "../../protocol.js";
import Shortcuts from "./Shortcuts.vue";
import SiteInfo from "./SiteInfo.vue";

export default {
  name: "SiteList",
  components: {
    Shortcuts,
    SiteInfo
  },
  props: {
    showNotes: {
      type: Boolean,
      required: true
    },
    showPasswords: {
      type: Boolean,
      required: true
    },
    recoveryCodeParams: {
      type: Object,
      required: true
    }
  },
  data()
  {
    return {
      sites: [],
    };
  },
  mounted()
  {
    this.updateData();
  },
  methods: {
    updateData: handleErrors(async function()
    {
      let {aliases, entries} = await nativeRequest("get-all-entries", {
        keys: this.$root.keys
      });

      let siteNames = new Set();
      let sites = new Map();
      for (let entry of entries)
      {
        siteNames.add(entry.hostname);

        if (!sites.has(entry.hostname))
          sites.set(entry.hostname, {site: entry.hostname, aliases: [], passwords: []});
        sites.get(entry.hostname).passwords.push(entry);
      }
      siteNames = [...siteNames];
      siteNames.sort();

      for (let alias of Object.keys(aliases))
      {
        let site = sites.get(aliases[alias]);
        if (site)
          site.aliases.push(alias);
      }

      let siteList = [];
      for (let name of siteNames)
        siteList.push(sites.get(name));
      this.sites = siteList;
    }),
    getLetters(sites)
    {
      let letters = [];
      let currentLetter = null;
      for (let site of sites)
      {
        let letter = getSiteDisplayName(site.site).toUpperCase()[0];
        if (letter != currentLetter && letter != "(")
        {
          currentLetter = letter;
          letters.push({letter, param: site.site});
        }
      }
      return letters;
    },
    scrollToSite(site)
    {
      this.$refs["site." + site].activate();
    },
    removeSite(site)
    {
      let index = this.sites.indexOf(site);
      if (index >= 0)
        this.sites.splice(index, 1);
    }
  }
};
</script>
