<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <form class="modal-form" @submit.prevent="done(value)">
    <label for="site-selection-site">{{ message }}</label>
    <input
      id="site-selection-site" v-model.trim="value" v-focus v-select
      type="text" placeholder="example.com" autocomplete="off"
      @keydown.arrow-down.prevent="activeIndex = Math.min(activeIndex + 1, sites.length - 1)"
      @keydown.arrow-up.prevent="activeIndex = Math.max(activeIndex - 1, -1)"
      @keydown.enter="enter"
    >
    <div class="site-autocomplete">
      <div
        v-for="(site, index) in sites" :key="site.name" v-scroll-active
        :class="{
          'site-entry': true,
          'active': activeIndex == index,
          'special-site': site.name != site.displayName
        }"
        @click="done(site.name)"
      >
        {{ site.prefix }}<strong>{{ site.match }}</strong>{{ site.suffix }}
      </div>
      <div v-if="!sites.length">
        {{ $t("no_sites") }}
      </div>
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("submit") }}</button>
    </div>
  </form>
</template>

<script>
"use strict";

import {getSiteDisplayName, handleErrors} from "../../common.js";
import {nativeRequest} from "../../protocol.js";

export default {
  name: "SiteSelection",
  localePath: "panel/components/SiteSelection",
  props: {
    message: {
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
      value: this.$root.site === null ? "" : this.$root.siteDisplayName,
      allSites: null,
      sites: [],
      activeIndex: -1,
      pageSize: 0
    };
  },
  watch: {
    value()
    {
      this.updateSites();
    }
  },
  mounted: handleErrors(async function()
  {
    let sites = await nativeRequest("get-sites", {
      keys: this.$root.keys
    });
    sites.sort();

    let index = sites.indexOf("");
    if (index >= 0)
      sites.splice(index, 1);
    sites.unshift("");

    this.allSites = sites.map(site =>
    {
      return {
        name: site,
        displayName: getSiteDisplayName(site)
      };
    });
    this.updateSites();
  }),
  methods: {
    updateSites()
    {
      this.sites = this.allSites
        .filter(site =>
        {
          let index = site.displayName.indexOf(this.value);
          if (index < 0)
            return false;

          site.prefix = site.displayName.substr(0, index);
          site.match = site.displayName.substr(index, this.value.length);
          site.suffix = site.displayName.substr(index + this.value.length);
          return true;
        });
    },
    enter(event)
    {
      if (this.activeIndex >= 0 && this.activeIndex < this.sites.length)
      {
        this.done(this.sites[this.activeIndex].name);
        event.preventDefault();
      }
    },
    done(site)
    {
      if (site !== null)
        this.callback(site);
    }
  }
};
</script>
