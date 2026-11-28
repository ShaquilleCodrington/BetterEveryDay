// Runs AFTER a release is built. Checks that the local installer,
// latest.yml, blockmap and app-update.yml belong together.
// It checks the files in release/, not the copies uploaded to GitHub.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUTPUT = "release";
const { version, build } = JSON.parse(fs.readFileSync("package.json", "utf-8"));

const fail = (message) =>
{
    console.error(`FAIL  ${message}\n\nDo NOT publish this release.`);
    process.exit(1);
};
const check = (passed, message) =>
{
    if (!passed) fail(message);
    console.log(`PASS  ${message}`);
};
const read = (file) =>
{
    if (!fs.existsSync(file)) fail(`missing file: ${file}`);
    return fs.readFileSync(file, "utf-8");
};
const field = (text, pattern) => pattern.exec(text)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const latest = read(path.join(OUTPUT, "latest.yml"));
check(field(latest, /^version:\s*(.+)$/m) === version, `latest.yml version is ${version}`);

const url = field(latest, /^\s*-\s*url:\s*(.+)$/m);
const sha512 = field(latest, /^\s+sha512:\s*(.+)$/m);
const size = Number(field(latest, /^\s+size:\s*(\d+)/m));
check(Boolean(url && sha512 && size), "latest.yml lists a file, sha512 and size");

// Local file names can use spaces where latest.yml uses hyphens.
const installer = fs.readdirSync(OUTPUT).find(
    (name) => name.endsWith(".exe") && name.replace(/ /g, "-") === url.replace(/ /g, "-")
);
check(Boolean(installer), `installer for "${url}" exists`);

const installerPath = path.join(OUTPUT, installer);
const bytes = fs.readFileSync(installerPath);
check(bytes.length === size, "installer size matches latest.yml");
check(
    crypto.createHash("sha512").update(bytes).digest("base64") === sha512,
    "installer sha512 matches latest.yml"
);

const blockmap = `${installerPath}.blockmap`;
check(fs.existsSync(blockmap) && fs.statSync(blockmap).size > 0, "blockmap exists");

const feed = read(path.join(OUTPUT, "win-unpacked", "resources", "app-update.yml"));
check(
    field(feed, /^owner:\s*(.+)$/m) === build.publish.owner &&
    field(feed, /^repo:\s*(.+)$/m) === build.publish.repo,
    "app-update.yml points to the configured GitHub repo"
);

console.log("\nRelease files verified.");