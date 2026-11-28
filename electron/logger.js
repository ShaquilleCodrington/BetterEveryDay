// ======================================================
// logger.js
// ------------------------------------------------------
// Writes main-process and updater messages to a file.
// Windows: %APPDATA%\BetterEveryDay\logs\main.log
// ======================================================

import log from "electron-log/main.js";

log.transports.file.level = "info";

// Records crashes without changing how Electron handles them.
process.on("uncaughtExceptionMonitor", (error) =>
{
    log.error("[main] uncaught exception:", error);
});

export default log;