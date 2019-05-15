/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";
import VueRouter from "vue-router";

import EnterMaster from "./pages/enterMaster.vue";
import ChangeMaster from "./pages/changeMaster.vue";
import Migration from "./pages/migration.vue";
import PasswordList from "./pages/passwordList.vue";
import Sync from "./pages/sync.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/enter-master",
    component: EnterMaster
  },
  {
    path: "/change-master",
    component: ChangeMaster
  },
  {
    path: "/migration",
    component: Migration
  },
  {
    path: "/password-list",
    component: PasswordList
  },
  {
    path: "/sync",
    component: Sync
  }
];

export default new VueRouter({
  mode: "abstract",
  routes
});
