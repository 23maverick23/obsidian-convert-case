"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
const mainJs = fs.readFileSync("main.js", "utf8");
const commandIds = Array.from(mainJs.matchAll(/id:\s*"([^"]+)"/g), (match) => match[1]);
const commandNames = Array.from(mainJs.matchAll(/name:\s*"([^"]+)"/g), (match) => match[1]);
const allowedManifestKeys = new Set([
	"author",
	"authorUrl",
	"description",
	"fundingUrl",
	"id",
	"isDesktopOnly",
	"minAppVersion",
	"name",
	"version",
]);
const requiredManifestKeys = [
	"author",
	"description",
	"id",
	"isDesktopOnly",
	"minAppVersion",
	"name",
	"version",
];

test("manifest follows Obsidian submission requirements", () => {
	assert.deepEqual(
		Object.keys(manifest).sort(),
		Object.keys(manifest)
			.filter((key) => allowedManifestKeys.has(key))
			.sort(),
	);

	for (const key of requiredManifestKeys) {
		assert.ok(Object.hasOwn(manifest, key), `Missing required manifest key: ${key}`);
	}

	assert.equal(manifest.id, "convert-case");
	assert.doesNotMatch(manifest.id, /obsidian/i);
	assert.match(manifest.id, /^[a-z0-9-]+$/);
	assert.equal(manifest.name, "Convert case");
	assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
	assert.match(manifest.minAppVersion, /^\d+\.\d+\.\d+$/);
	assert.equal(typeof manifest.description, "string");
	assert.ok(manifest.description.length <= 250);
	assert.ok(manifest.description.endsWith("."));
	assert.doesNotMatch(manifest.description, /^this is a plugin/i);
	assert.equal(manifest.author, "Ryan Morrissey");
	assert.match(manifest.authorUrl, /^https:\/\/\S+$/);
	assert.equal(Object.hasOwn(manifest, "fundingUrl"), false);
	assert.equal(typeof manifest.isDesktopOnly, "boolean");
	assert.equal(manifest.isDesktopOnly, false);
	assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test("publishable project metadata is present", () => {
	assert.ok(fs.existsSync("README.md"));
	assert.equal(fs.existsSync("LICENSE"), true);
	assert.match(fs.readFileSync("LICENSE", "utf8"), /^MIT License/);
	assert.equal(packageJson.license, "MIT");
	assert.doesNotMatch(packageJson.description, /^an? obsidian plugin/i);
});

test("main plugin file avoids common review blockers", () => {
	assert.ok(commandIds.length > 0);
	assert.equal(commandIds.length, commandNames.length);

	for (const commandId of commandIds) {
		assert.doesNotMatch(commandId, new RegExp(`^${manifest.id}-`));
		assert.notEqual(commandId, manifest.id);
	}

	for (const commandName of commandNames) {
		assert.doesNotMatch(commandName.toLowerCase(), new RegExp(`^${manifest.name.toLowerCase()}:`));
		assert.notEqual(commandName.toLowerCase(), manifest.name.toLowerCase());
	}

	assert.doesNotMatch(mainJs, /window\.app\b/);
	assert.doesNotMatch(mainJs, /\bapp\.workspace\b/);
	assert.doesNotMatch(mainJs, /\bconsole\./);
	assert.doesNotMatch(mainJs, /\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b/);
	assert.doesNotMatch(mainJs, /\beval\s*\(/);
	assert.doesNotMatch(mainJs, /\(\?<[:!=]/);
	assert.doesNotMatch(mainJs, /\bhotkeys\s*:/);
	assert.doesNotMatch(mainJs, /require\(["'](?:fs|crypto|os|path|electron)["']\)/);
	assert.doesNotMatch(mainJs, /Convert Case|Title Case|Upper Case|Lower Case|Swap Case/);
});

test("dependency policy stays locked down", () => {
	assert.deepEqual(packageJson.dependencies, {});
	assert.deepEqual(packageJson.devDependencies, {});
});
