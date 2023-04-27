<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="list">
    <Shortcuts :letters="letters" @clicked="scrollToSite" />

    <div class="filter-row">
      <label for="site-filter">{{ $t("filters") }}</label>
      <input id="site-filter" v-model.trim="siteFilter" type="search" :placeholder="$t('site_filter_placeholder')">
      <select v-if="tags.length" v-model="tagFilter">
        <option :value="null">{{ $t("tag_filter_placeholder") }}</option>
        <option v-for="tag in tags" :key="tag">{{ tag }}</option>
      </select>
    </div>

    <template v-for="site in sites" :key="site.site">
      <SiteInfo
        v-if="site.passwords.some(shouldShow)"
        :ref="'site.' + site.site" :site="site" :show-notes="showNotes"
        :show-passwords="showPasswords" :recovery-code-params="recoveryCodeParams"
        @removed="removeSite(site)"
      />
    </template>
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
  localePath: "allpasswords/components/SiteList",
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
      letters: [],
      tags: [],
      siteFilter: null,
      tagFilter: null
    };
  },
  watch: {
    sites: {
      handler()
      {
        this.updateLetters();
        this.updateTags();
      },
      deep: true
    },
    siteFilter()
    {
      this.updateLetters();
    },
    tagFilter()
    {
      this.updateLetters();
    }
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

      let modifiedAliases = false;
      for (let alias of Object.keys(aliases))
      {
        let site = sites.get(aliases[alias]);
        if (!site || sites.has(alias))
        {
          delete aliases[alias];
          modifiedAliases = true;
        }
        else if (site)
          site.aliases.push(alias);
      }

      if (modifiedAliases)
      {
        await nativeRequest("set-aliases", {
          keys: this.$root.keys,
          aliases
        });
      }

      let siteList = [];
      for (let name of siteNames)
      {
        let siteInfo = sites.get(name);
        siteInfo.aliases.sort();
        siteInfo.passwords.sort((a, b) =>
        {
          if (a.title < b.title)
            return -1;
          else if (a.title > b.title)
            return 1;
          else
            return 0;
        });
        siteList.push(siteInfo);
      }
      this.sites = siteList;
    }),

    shouldShow(entry)
    {
      if (this.siteFilter && !entry.hostname.includes(this.siteFilter))
        return false;

      if (this.tagFilter && (!entry.tags || !entry.tags.includes(this.tagFilter)))
        return false;

      return true;
    },

    updateLetters()
    {
      let letters = [];
      let currentLetter = null;
      let filter = entry => this.shouldShow(entry);
      for (let site of this.sites)
      {
        if (!site.passwords.some(filter))
          continue;

        let letter = getSiteDisplayName(site.site).toUpperCase()[0];
        if (letter != currentLetter && letter != "(")
        {
          currentLetter = letter;
          letters.push({letter, param: site.site});
        }
      }
      this.letters = letters;
    },

    updateTags()
    {
      let tags = new Set();
      for (let site of this.sites)
        for (let password of site.passwords)
          for (let tag of password.tags || [])
            tags.add(tag);

      this.tags = [...tags.keys()].sort();
      if (!this.tags.includes(this.tagFilter))
        this.tagFilter = null;
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
