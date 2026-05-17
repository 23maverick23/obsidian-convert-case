import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const bumpTypes = new Set(["major", "minor", "patch"]);

const requestedVersion = process.argv[2];

if (requestedVersion === "--help" || requestedVersion === "-h") {
	printUsage();
	process.exit(0);
}

if (!requestedVersion) {
	printUsage();
	process.exit(1);
}

const manifest = await readJson("manifest.json");
const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const versions = await readJson("versions.json");

const currentVersion = manifest.version;
const minAppVersion = manifest.minAppVersion;

assertVersion(currentVersion, "manifest.json version");

if (!minAppVersion) {
	fail("manifest.json must include minAppVersion before bumping a release.");
}

if (packageJson.version !== currentVersion) {
	fail(`package.json version ${packageJson.version} does not match manifest.json version ${currentVersion}.`);
}

if (packageLock.version !== currentVersion) {
	fail(`package-lock.json version ${packageLock.version} does not match manifest.json version ${currentVersion}.`);
}

if (packageLock.packages?.[""]?.version !== currentVersion) {
	fail(
		`package-lock.json packages[""].version ${packageLock.packages?.[""]?.version} does not match manifest.json version ${currentVersion}.`,
	);
}

const nextVersion = getNextVersion(currentVersion, requestedVersion);

if (compareVersions(nextVersion, currentVersion) <= 0) {
	fail(`Next version ${nextVersion} must be greater than current version ${currentVersion}.`);
}

if (Object.prototype.hasOwnProperty.call(versions, nextVersion)) {
	fail(`versions.json already contains ${nextVersion}.`);
}

manifest.version = nextVersion;
packageJson.version = nextVersion;
packageLock.version = nextVersion;
packageLock.packages[""].version = nextVersion;
versions[nextVersion] = minAppVersion;

await writeJson("manifest.json", manifest);
await writeJson("package.json", packageJson);
await writeJson("package-lock.json", packageLock);
await writeJson("versions.json", versions);

console.log(`Updated release metadata from ${currentVersion} to ${nextVersion}.`);
console.log("");
console.log("Next steps:");
console.log("  npm run check");
console.log("  git add -A");
console.log(`  git commit -m "chore: release ${nextVersion}"`);
console.log("  git push origin main");
console.log(`  git tag ${nextVersion}`);
console.log(`  git push origin ${nextVersion}`);

function getNextVersion(current, requested) {
	if (bumpTypes.has(requested)) {
		const version = parseVersion(current);

		if (requested === "major") {
			return formatVersion(version.major + 1, 0, 0);
		}

		if (requested === "minor") {
			return formatVersion(version.major, version.minor + 1, 0);
		}

		return formatVersion(version.major, version.minor, version.patch + 1);
	}

	assertVersion(requested, "requested version");
	return requested;
}

function parseVersion(version) {
	const match = versionPattern.exec(version);

	if (!match) {
		fail(`Invalid semantic version: ${version}`);
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	};
}

function assertVersion(version, label) {
	if (!versionPattern.test(version)) {
		fail(`${label} must be a strict x.y.z semantic version.`);
	}
}

function compareVersions(left, right) {
	const leftVersion = parseVersion(left);
	const rightVersion = parseVersion(right);

	return (
		leftVersion.major - rightVersion.major ||
		leftVersion.minor - rightVersion.minor ||
		leftVersion.patch - rightVersion.patch
	);
}

function formatVersion(major, minor, patch) {
	return `${major}.${minor}.${patch}`;
}

async function readJson(fileName) {
	return JSON.parse(await readFile(resolve(repoRoot, fileName), "utf8"));
}

async function writeJson(fileName, value) {
	await writeFile(resolve(repoRoot, fileName), `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}

function printUsage() {
	console.log("Usage:");
	console.log("  npm run release:patch");
	console.log("  npm run release:minor");
	console.log("  npm run release:major");
	console.log("  npm run release:bump -- 0.2.0");
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
