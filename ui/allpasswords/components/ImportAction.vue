<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <IconicLink ref="import" class="import" :title="$t('import')" @click="showImportMenu" />
  <ImportMenu v-if="importMenuPosition" :position="importMenuPosition" @done="importMenuPosition = null" />
  <ConfirmImport v-if="importData" :data="importData" @done="confirmImportDone" />
  <QueryImportPassword v-if="queryPasswordPromise" :show-warning="queryPasswordRepeat" @done="queryPasswordDone" />
  <input ref="importFile" type="file" hidden @change="importFileSelected">
</template>

<script>
"use strict";

import {handleErrors, getSiteDisplayName} from "../../common.js";
import {nativeRequest} from "../../protocol.js";
import ConfirmImport from "../modals/ConfirmImport.vue";
import ImportMenu from "../modals/ImportMenu.vue";
import QueryImportPassword from "../modals/QueryImportPassword.vue";
import pfp2xImporter from "../importers/pfp2x.js";
import csvImporter from "../importers/csv.js";

export default {
  name: "ImportAction",
  localePath: "allpasswords/components/ImportAction",
  components: {
    ConfirmImport,
    ImportMenu,
    QueryImportPassword
  },
  data()
  {
    return {
      importMenuPosition: null,
      selectFileCallback: null,
      confirmImportCallback: null,
      importData: null,
      queryPasswordPromise: null,
      queryPasswordRepeat: false
    };
  },
  methods: {
    showImportMenu()
    {
      let button = this.$refs.import.$el;

      let rtl = document.documentElement.getAttribute("dir") == "rtl";
      let position = {
        top: button.offsetTop + button.offsetHeight
      };
      if (rtl)
        position.left = button.offsetLeft;
      else
        position.right = window.innerWidth - button.offsetLeft - button.offsetWidth;
      this.importMenuPosition = position;
    },
    async readFile(file)
    {
      return new Promise((resolve, reject) =>
      {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(this.$t("load_error"));
        reader.readAsText(file);
      });
    },
    importPfP2x: handleErrors(async function()
    {
      this.doImport("application/json", pfp2xImporter);
    }),
    importCSV: handleErrors(async function()
    {
      this.doImport("text/csv", csvImporter);
    }),
    selectImportFile(mime)
    {
      return new Promise(resolve =>
      {
        this.selectFileCallback = resolve;
        this.$refs.importFile.setAttribute("accept", mime);
        this.$refs.importFile.click();
      });
    },
    importFileSelected(event)
    {
      let callback = this.selectFileCallback;
      this.selectFileCallback = null;

      let file = event.target.files[0];
      event.target.value = "";
      if (callback)
        callback(file);
    },
    confirmImport(data)
    {
      return new Promise(resolve =>
      {
        this.confirmImportCallback = resolve;
        this.importData = data;
      });
    },
    confirmImportDone(confirmed)
    {
      let callback = this.confirmImportCallback;
      this.confirmImportCallback = null;
      this.importData = null;
      callback(confirmed);
    },
    queryPassword(repeat)
    {
      return new Promise((resolve, reject) =>
      {
        this.queryPasswordRepeat = repeat;
        this.queryPasswordPromise = [resolve, reject];
      });
    },
    queryPasswordDone(success, password)
    {
      let [resolve, reject] = this.queryPasswordPromise;
      this.queryPasswordPromise = null;
      if (success)
        resolve(password);
      else
        reject("canceled");
    },
    async doImport(mimeType, importer)
    {
      let file = await this.selectImportFile(mimeType);
      let data = await this.readFile(file);
      let password = null;

      this.$root.inProgress = true;
      try
      {
        let result;
        for (;;)
        {
          try
          {
            result = await importer(data, password);
            break;
          }
          catch (error)
          {
            if (error == "password_required" || error == "wrong_password")
            {
              try
              {
                password = await this.queryPassword(error == "wrong_password");
              }
              catch (error)
              {
                if (error == "canceled")
                  return;
                throw error;
              }
            }
            else
            {
              this.$root.showGlobalMessage(error);
              return;
            }
          }
        }

        let sites = new Map();
        for (let entry of result.entries)
        {
          if (!sites.has(entry.hostname))
          {
            sites.set(entry.hostname, {
              name: getSiteDisplayName(entry.hostname),
              entries: [],
              aliases: []
            });
          }

          sites.get(entry.hostname).entries.push(entry);
        }

        for (let [alias, name] of Object.entries(result.aliases))
          if (!sites.has(alias) && sites.has(name))
            sites.get(name).aliases.push(alias);

        let siteNames = [...sites.keys()];
        siteNames.sort();
        sites = siteNames.map(name => sites.get(name));
        if (!sites.length)
        {
          this.$root.showGlobalMessage("import_no_data");
          return;
        }

        if (!await this.confirmImport(sites))
          return;

        await nativeRequest("import", {
          keys: this.$root.keys,
          aliases: result.aliases,
          entries: result.entries
        });
        this.$root.showGlobalMessage("import_success");
        this.$root.updateData();
      }
      finally
      {
        this.$root.inProgress = false;
      }
    }
  }
};
</script>
