<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="global-actions">
    <a class="export" href="#" :title="$t('allpasswords_export')" @click.prevent="exportData" />
    <a class="import" href="#" :title="$t('allpasswords_import')" @click.prevent="selectImportFile" />
    <a class="print" href="#" :title="$t('allpasswords_print')" @click.prevent="printPage" />
    <input ref="importFile" type="file" accept="application/json,text/csv" hidden @change="importFileSelected">
    <iframe ref="frame" class="exportDataFrame" />
    <enter-master v-if="enterMasterCallback"
                  :warning="$t('allpasswords_import_with_master')"
                  :callback="enterMasterCallback"
                  @cancel="enterMasterCallback = null"
    />
  </div>
</template>

<script>
"use strict";

import {passwords} from "../../proxy";
import EnterMaster from "../modals/EnterMaster.vue";

export default {
  name: "GlobalActions",
  components: {
    "enter-master": EnterMaster
  },
  data()
  {
    return {
      enterMasterCallback: null
    };
  },
  methods: {
    exportData()
    {
      passwords.exportPasswordData().then(data =>
      {
        // See https://bugzil.la/1379960, in Firefox this will only work with a
        // link inside a frame.
        let frameDoc = this.$refs.frame.contentDocument;
        let link = frameDoc.body.lastChild;
        if (!link || link.localName != "a")
        {
          link = frameDoc.createElement("a");
          frameDoc.body.appendChild(link);
        }

        let blob = new Blob([data], {type: "application/json"});
        link.href = URL.createObjectURL(blob);
        link.download = "passwords-backup-" + new Date().toISOString().replace(/T.*/, "") + ".json";
        link.click();
      }).catch(this.$app.showUnknownError);
    },
    selectImportFile()
    {
      this.$refs.importFile.click();
    },
    importFileSelected(event)
    {
      let reader = new FileReader();
      reader.onload = () =>
      {
        this.$app.confirm(this.$t("allpasswords_import_confirm")).then(accepted =>
        {
          if (accepted)
            this.doImport(reader.result);
        });
      };
      reader.readAsText(event.target.files[0]);
      event.target.value = "";
    },
    doImport(data, masterPass)
    {
      this.$app.inProgress = true;
      passwords.importPasswordData(data, masterPass).then(() =>
      {
        this.$app.inProgress = false;
        this.$app.showGlobalMessage("allpasswords_import_success");
        this.$app.updateData();
      }).catch(error =>
      {
        this.$app.inProgress = false;
        if (error == "wrong_master_password")
          this.enterMasterCallback = newMaster => this.doImport(data, newMaster);
        else
          this.$app.showUnknownError(error);
      });
    },
    printPage()
    {
      window.print();
    }
  }
};
</script>
