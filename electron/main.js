// Import Electron modules used to control the application
// and create native desktop windows.
import { app, BrowserWindow, ipcMain, Notification, dialog } from "electron";
import { createMainWindow } from "./windows/mainWindow.js";
import { createTimerWindow } from "./windows/timerWindow.js";
import log from "./logger.js";
import fs from "node:fs";
import path from "node:path";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

// Windows: must match build.appId so the taskbar groups and shows the right icon.
app.setAppUserModelId("com.bettereveryday.app");

    // Profile data persistence
    // ------------------------------------------------------
    // The user's profile (name, titles, bio, photo) lives in its own
    // folder inside Electron's userData directory, as a small JSON file
    // on disk — separate from anything else the app stores, and
    // reachable across app restarts/updates like the rest of the app's
    // saved data.
    //   <userData>/profile/profile.json
    const PROFILE_DIR = () => path.join(app.getPath("userData"), "profile");
    const PROFILE_FILE = () => path.join(PROFILE_DIR(), "profile.json");

    // This is what shows up as the sender name on notifications (instead
    // of the generic "Electron"), in the taskbar, and in userData paths.
    app.setName("BetterEveryDay");

    // Window and update state
    // ------------------------------------------------------
    let mainWindow = null;

    // True once an update has finished downloading and is
    // waiting to be installed.
    let isUpdateReady = false;

    // Closes every window except the main window (the floating timer).
    function closeOtherWindows()
    {
        BrowserWindow.getAllWindows().forEach((win) =>
        {
            if (win !== mainWindow && !win.isDestroyed())
            {
                log.info("[windows] closing timer window for update");
                win.close();
            }
        });
    }

    function openMainWindow()
    {
        mainWindow = createMainWindow();

        mainWindow.on("closed", () =>
        {
            log.info("[windows] main window closed");
            mainWindow = null;

            // With an update waiting, a leftover timer window would keep
            // the app running and stop the install-on-quit from starting.
            if (isUpdateReady)
            {
                closeOtherWindows();
            }
        });
    }

    function showMainWindow()
    {
        if (!mainWindow)
        {
            openMainWindow();
            return;
        }

        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }

    // Auto updater
    // ------------------------------------------------------
    // electron-updater downloads the update, starts the installer and
    // quits the app. The app never force-exits or kills processes itself.
    async function promptToInstall(version)
    {
        const options = {
            type: "info",
            title: "Update Ready",
            message: `A new version of BetterEveryDay (${version}) has been downloaded.`,
            detail: "Restart now to install it, or choose Later and it will install after you close the app.",
            buttons: ["Restart Now", "Later"],
            defaultId: 0,
            cancelId: 1,
        };

        const { response } = mainWindow
            ? await dialog.showMessageBox(mainWindow, options)
            : await dialog.showMessageBox(options);

        if (response !== 0)
        {
            log.info("[updater] user chose Later; update installs on quit");
            return;
        }

        log.info("[updater] user chose Restart Now");
        closeOtherWindows();

        // isSilent = true, isForceRunAfter = true (reopen after install)
        autoUpdater.quitAndInstall(true, true);
    }

    function setupAutoUpdater()
    {
        autoUpdater.logger = log;
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on("update-downloaded", (info) =>
        {
            isUpdateReady = true;
            log.info(`[updater] update ${info.version} downloaded`);

            promptToInstall(info.version).catch((error) =>
            {
                log.error("[updater] install prompt failed:", error);
            });
        });

        // A failed check or download must never stop the app.
        autoUpdater.on("error", (error) =>
        {
            log.error("[updater] error:", error);
        });

        // The check and the download are separate promises. Both are
        // awaited so neither can reject without being handled.
        autoUpdater.checkForUpdates()
            .then((result) => result?.downloadPromise)
            .catch((error) =>
            {
                log.error("[updater] update check or download failed:", error);
            });
    }

    // Single-instance lock
    // ------------------------------------------------------
    // Only for the installed app. Development shares the same app name,
    // so locking it would stop `npm run dashboard` while the installed
    // app is open.
    const hasInstanceLock = !app.isPackaged || app.requestSingleInstanceLock();

    if (!hasInstanceLock)
    {
        log.info("[app] another instance is already running; quitting this one");
        app.quit();
    }
    else
    {
        app.on("second-instance", () =>
        {
            log.info("[app] second launch detected; showing main window");
            app.whenReady().then(showMainWindow);
        });

        // Wait until Electron has finished starting before
        // creating the application's main window.
        app.whenReady().then(() =>
        {
            log.info(`[app] started: version ${app.getVersion()}, pid ${process.pid}, path ${process.execPath}`);

            //creates mainWindow for application
            openMainWindow();

            // Updates only work in the installed (packaged) app.
            if (app.isPackaged)
            {
                setupAutoUpdater();
            }
        });
    }

    // Quit steps, recorded so a stuck shutdown can be traced.
    app.on("before-quit", () => log.info("[app] before-quit"));
    app.on("will-quit", () => log.info("[app] will-quit"));
    app.on("quit", (_event, exitCode) => log.info(`[app] quit, exit code ${exitCode}`));

    ipcMain.on("open-timer", () =>
        {
            createTimerWindow();
        });
    
     ipcMain.on("window-minimize", (event) =>
        {
            const sourceWindow = BrowserWindow.fromWebContents(event.sender);
            if (sourceWindow)
            {
                sourceWindow.minimize();
            }
        });

    ipcMain.on("window-maximize", (event) =>
        {
            const sourceWindow = BrowserWindow.fromWebContents(event.sender);
            if (sourceWindow)
            {
                if (sourceWindow.isMaximized())
                {
                    sourceWindow.unmaximize();
                }
                else
                {
                    sourceWindow.maximize();
                }
            }
        });

    // Fired by the timer window (via preload) the moment a countdown
    // hits zero. Shows a native OS notification with simple text.
    // `silent: true` because the notification *sound* is handled in the
    // renderer instead (see notificationSound.ts) -- that's what lets
    // users pick a preset or custom sound and control its volume,
    // which the OS notification sound can't do.
    ipcMain.on("timer-complete", (event, payload = {}) =>
        {
            console.log("[main] timer-complete received", payload);
            console.log("[main] Notification.isSupported():", Notification.isSupported());

            if (!Notification.isSupported())
            {
                console.warn("[main] Notification not supported on this platform/build — nothing will show.");
                return;
            }

            const notification = new Notification({
                title: payload.title || "Timer finished",
                body: payload.body || "Your timer is up.",
                silent: true,
            });

                // Clicking the notification brings the window that
                // finished the timer back into focus.
            notification.on("click", () =>
                {
                    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
                    if (sourceWindow)
                    {
                        if (sourceWindow.isMinimized()) sourceWindow.restore();
                        sourceWindow.show();
                        sourceWindow.focus();
                    }
                });

            notification.on("show", () => console.log("[main] notification shown"));
            notification.on("failed", (_e, error) => console.error("[main] notification failed:", error));

            notification.show();
        });

    // Notification sound file picking/reading
    // ------------------------------------------------------
    // Two handlers back the "custom sound" option in
    // Settings > Notifications:
    //   - select-audio-file: opens a native file picker
    //   - read-audio-file: reads the chosen file and returns it
    //     as a base64 data URL, since Chromium's renderer won't
    //     load arbitrary file:// paths directly.
    const AUDIO_MIME_TYPES = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".flac": "audio/flac",
        ".aac": "audio/aac",
    };

    ipcMain.handle("select-audio-file", async (event) =>
        {
            const sourceWindow = BrowserWindow.fromWebContents(event.sender);

            const result = await dialog.showOpenDialog(sourceWindow, {
                title: "Choose a notification sound",
                properties: ["openFile"],
                filters: [
                    { name: "Audio files", extensions: ["mp3", "wav", "ogg", "m4a", "flac", "aac"] },
                ],
            });

            if (result.canceled || result.filePaths.length === 0) return null;
            return result.filePaths[0];
        });

    ipcMain.handle("read-audio-file", async (_event, filePath) =>
        {
            if (!filePath || typeof filePath !== "string") return null;

            try
            {
                const buffer = await fs.promises.readFile(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mime = AUDIO_MIME_TYPES[ext] || "audio/mpeg";
                return `data:${mime};base64,${buffer.toString("base64")}`;
            }
            catch (error)
            {
                console.error("[main] failed to read custom sound file:", error);
                return null;
            }
        });

    // Profile save/load
    // ------------------------------------------------------
    // Backs the Profile page. Reads/writes a single JSON file in its
    // own "profile" folder under userData (see PROFILE_DIR/PROFILE_FILE
    // above), rather than sharing storage with anything else.
    ipcMain.handle("profile:load", async () =>
        {
            try
            {
                const raw = await fs.promises.readFile(PROFILE_FILE(), "utf-8");
                return JSON.parse(raw);
            }
            catch (error)
            {
                // No profile saved yet (first run) — not a real error.
                // An empty or unreadable profile.json (SyntaxError) also means
                // there is no usable profile, so it returns null with a short
                // warning instead of a full error and stack trace.
                if (error instanceof SyntaxError)
                {
                    console.warn("[main] profile.json is empty or invalid; treating it as no saved profile.");
                }
                else if (error.code !== "ENOENT")
                {
                    console.error("[main] failed to read profile.json:", error);
                }
                return null;
            }
        });

    ipcMain.handle("profile:save", async (_event, profile) =>
        {
            try
            {
                await fs.promises.mkdir(PROFILE_DIR(), { recursive: true });
                await fs.promises.writeFile(PROFILE_FILE(), JSON.stringify(profile, null, 2), "utf-8");
                return true;
            }
            catch (error)
            {
                console.error("[main] failed to write profile.json:", error);
                return false;
            }
        });
    


        // Recreate the window if the application is activated
        // and no windows are currently open (primarily for macOS).
    app.on("activate", () =>
    {
        if (BrowserWindow.getAllWindows().length === 0)
        {
            openMainWindow();
        }
    });


     // Close the application once every window has been closed.
    app.on("window-all-closed", () =>
    {
        app.quit();
    });