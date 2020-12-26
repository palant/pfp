<!--
 - This Source Code is subject to the terms of the Mozilla Public License
 - version 2.0 (the "License"). You can obtain a copy of the License at
 - http://mozilla.org/MPL/2.0/.
 -->

<template>
  <div class="global-actions">
    <IconicLink class="export" :title="$t('export')" @click="exportData" />
    <IconicLink class="import" :title="$t('import')" @click="selectImportFile" />
    <IconicLink class="print" :title="$t('print')" @click="printPage" />
    <input ref="importFile" type="file" accept="application/json,text/csv" hidden @change="importFileSelected">
    <iframe ref="frame" class="exportDataFrame" />
    <EnterMaster v-if="enterMasterCallback" class="modal-form"
                 :warning="$t('import_with_master')"
                 :callback="enterMasterCallback"
                 @done="enterMasterCallback = null"
    />
  </div>
</template>

<script>
"use strict";

import {passwords} from "../../proxy.js";
import EnterMaster from "../modals/EnterMaster.vue";

export default {
  name: "GlobalActions",
  localePath: "allpasswords/components/GlobalActions",
  components: {
    EnterMaster
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
      }).catch(this.$root.showGlobalMessage);
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
        this.$root.confirm(this.$t("import_confirm")).then(accepted =>
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
      this.$root.inProgress = true;
      passwords.importPasswordData(data, masterPass).then(() =>
      {
        this.$root.inProgress = false;
        this.$root.showGlobalMessage("import_success");
        this.$root.updateData();
      }).catch(error =>
      {
        this.$root.inProgress = false;
        if (error == "wrong_master_password")
          this.enterMasterCallback = newMaster => this.doImport(data, newMaster);
        else
          this.$root.showGlobalMessage(error);
      });
    },
    printPage()
    {
      window.print();
    }
  }
};
</script>
