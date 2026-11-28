// Runs BEFORE a release is built. Stops the release if something
// the updater depends on is missing or wrong.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf-8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf-8" }).trim();

const failures = [];
const check = (passed, message) =>
{
    console.log(`${passed ? "PASS" : "FAIL"}  ${message}`);
    if (!passed) failures.push(message);
};

const { version } = readJson("package.json");

// 1. The installer fix is really in the installed library.
const builderVersion = readJson("node_modules/app-builder-lib/package.json").version;
check(builderVersion === "26.18.0", `app-builder-lib is 26.18.0 (found ${builderVersion})`);

const template = fs.readFileSync(
    "node_modules/app-builder-lib/templates/nsis/include/allowOnlyOneInstallerInstance.nsh",
    "utf-8"
);
check(
    template.includes("if (@(Get-CimInstance -ClassName Win32_Process"),
    "installer process-count patch is applied"
);
// An edit only inside node_modules is lost on a clean install.
check(
    git("ls-files", "patches/app-builder-lib+26.18.0.patch") !== "",
    "installer patch file is saved in Git"
);

// 2. A custom installer script would be included automatically.
check(!fs.existsSync("build/installer.nsh"), "no unreviewed build/installer.nsh");

// 3. The icon exists and is saved in Git.
check(fs.existsSync("build/icon.ico"), "build/icon.ico exists");
check(git("ls-files", "build/icon.ico") !== "", "build/icon.ico is tracked by Git");

// 4. Everything being released is committed.
check(git("status", "--porcelain") === "", "no uncommitted changes");

// 5. The version is newer than every released tag.
const parse = (text) => /^v(\d+)\.(\d+)\.(\d+)$/.exec(text)?.slice(1).map(Number);
const isNewer = (a, b) =>
{
    for (let i = 0; i < 3; i++)
    {
        if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
};

const current = parse(`v${version}`);
check(Boolean(current), `version "${version}" has the form 1.2.3`);

// Tags are read from GitHub, so stale local tags do not matter.
const tags = new Map();
for (const line of git("ls-remote", "--tags", "origin").split("\n").filter(Boolean))
{
    const [commit, ref] = line.split("\t");
    const name = ref.replace("refs/tags/", "").replace("^{}", "");
    tags.set(name, commit); // the "^{}" line (real commit) comes last
}

if (current)
{
    const newerOrEqual = [...tags.keys()].filter((name) =>
    {
        const other = parse(name);
        return other && name !== `v${version}` && !isNewer(current, other);
    });
    check(newerOrEqual.length === 0, `v${version} is newer than all other tags ${newerOrEqual.join(" ")}`);
}

const existing = tags.get(`v${version}`);
check(
    !existing || existing === git("rev-parse", "HEAD"),
    `tag v${version} is unused, or points to this commit`
);

if (failures.length > 0)
{
    console.error(`\nRelease check failed (${failures.length}). Nothing was built.`);
    process.exit(1);
}
console.log("\nRelease check passed.");