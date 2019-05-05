<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <form class="page" @submit.prevent="submit" @reset.prevent="reset" @keydown.escape.prevent="reset">
    <label for="site-selection-site">{{ message }}</label>
    <input id="site-selection-site" v-model.trim="value" v-focus v-select
           type="text" placeholder="example.com" autocomplete="off"
           @keydown.arrow-down.prevent="activeIndex = Math.min(activeIndex + 1, sites.length - 1)"
           @keydown.arrow-up.prevent="activeIndex = Math.max(activeIndex - 1, -1)"
           @keydown.enter="enter"
    >
    <div id="site-autocomplete">
      <div v-for="(site, index) in sites" :key="site.name" v-scroll-active
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
        {{ $t("autocomplete_no_sites") }}
      </div>
    </div>
    <div class="button-container">
      <button type="submit">{{ $t("ok") }}</button>
      <button type="reset">{{ $t("cancel") }}</button>
    </div>
  </form>
</template>

<script>
"use strict";

import {getSiteDisplayName} from "../../common";
import {passwords} from "../../proxy";
import {app, showUnknownError} from "../App.vue";

export default {
  data()
  {
    return {
      value: app.site && app.siteDisplayName,
      allSites: null,
      sites: [],
      activeIndex: -1,
      pageSize: 0
    };
  },
  computed: {
    message()
    {
      if (!this.$route.query.alias)
        return this.$t("select_site");
      else
        return this.$t("select_alias", app.origSite);
    }
  },
  watch: {
    value()
    {
      this.updateSites();
    }
  },
  mounted()
  {
    passwords.getAllSites()
      .then(sites =>
      {
        let index = sites.indexOf("pfp.invalid");
        if (index >= 0)
          sites.splice(index, 1);
        sites.unshift("pfp.invalid");

        this.allSites = sites.map(site =>
        {
          return {
            name: site,
            displayName: getSiteDisplayName(site)
          };
        });
        this.updateSites();
      })
      .catch(showUnknownError);
  },
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
    submit()
    {
      this.done(this.value);
    },
    reset()
    {
      this.done(null);
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
      if (site)
      {
        if (!this.$route.query.alias)
        {
          passwords.getPasswords(site)
            .then(([origSite, site, pwdList]) =>
            {
              app.origSite = origSite;
              app.site = site;
              app.pwdList = pwdList;
            })
            .catch(showUnknownError);
        }
        else if (site != app.origSite)
        {
          passwords.addAlias(app.origSite, site)
            .then(() => passwords.getPasswords(app.origSite))
            .then(([origSite, site, pwdList]) =>
            {
              app.origSite = origSite;
              app.site = site;
              app.pwdList = pwdList;
            })
            .catch(showUnknownError);
        }
      }
      this.$router.push("/password-list");
    }
  }
};
</script>
