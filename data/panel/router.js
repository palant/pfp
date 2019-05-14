/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

const routes = [
  {
    path: "/enter-master",
    component: require("./pages/enterMaster.vue").default
  },
  {
    path: "/change-master",
    component: require("./pages/changeMaster.vue").default
  },
  {
    path: "/migration",
    component: require("./pages/migration.vue").default
  },
  {
    path: "/password-list",
    component: require("./pages/passwordList.vue").default
  },
  {
    path: "/sync",
    component: require("./pages/sync.vue").default
  }
];

export default new VueRouter({
  mode: "abstract",
  routes
});
