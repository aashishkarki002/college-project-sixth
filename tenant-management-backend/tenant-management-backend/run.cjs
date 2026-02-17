/**
 * CommonJS bootstrap for cPanel/LiteSpeed.
 * LiteSpeed loads the app with require(), which cannot load ESM with top-level await.
 * This file is CJS and dynamically imports the ESM server.
 */
"use strict";

require("dotenv").config();

import("./src/server.js").catch(function (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
});
