"use strict";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
	if (request === "obsidian") {
		return { Plugin: class Plugin {} };
	}

	return originalLoad.call(this, request, parent, isMain);
};

const { __test: convertCase } = require("../main.js");
Module._load = originalLoad;

test("extractWords handles separators and camel boundaries", () => {
	assert.deepEqual(convertCase.extractWords("XMLHttpRequest_parser-v2"), [
		"XML",
		"Http",
		"Request",
		"parser",
		"v2",
	]);
});

test("converts prose to identifier cases per line", () => {
	const text = "  hello world\nKeep XML parser";

	assert.equal(convertCase.toIdentifierCase(text, convertCase.toSnakeCase), "  hello_world\nkeep_xml_parser");
	assert.equal(convertCase.toIdentifierCase(text, convertCase.toKebabCase), "  hello-world\nkeep-xml-parser");
	assert.equal(convertCase.toIdentifierCase(text, convertCase.toCamelCase), "  helloWorld\nkeepXmlParser");
	assert.equal(convertCase.toIdentifierCase(text, convertCase.toPascalCase), "  HelloWorld\nKeepXmlParser");
});

test("converts basic text case without changing separators", () => {
	assert.equal(convertCase.toTitleCase("hello, WORLD. don't stop"), "Hello, World. Don't Stop");
	assert.equal(convertCase.toSwapCase("AbC 123 xYz"), "aBc 123 XyZ");
});

test("replaceSelections updates multiple selections and keeps converted text selected", () => {
	const editor = new FakeEditor("alpha beta\nFOOBar baz", [
		{
			anchor: { line: 0, ch: 0 },
			head: { line: 0, ch: 10 },
		},
		{
			anchor: { line: 1, ch: 0 },
			head: { line: 1, ch: 10 },
		},
	]);

	const changed = convertCase.replaceSelections(editor, (text) =>
		convertCase.toIdentifierCase(text, convertCase.toSnakeCase),
	);

	assert.equal(changed, true);
	assert.equal(editor.value, "alpha_beta\nfoo_bar_baz");
	assert.deepEqual(editor.selections, [
		{
			from: { line: 0, ch: 0 },
			to: { line: 0, ch: 10 },
		},
		{
			from: { line: 1, ch: 0 },
			to: { line: 1, ch: 11 },
		},
	]);
	assert.equal(editor.focused, true);
});

class FakeEditor {
	constructor(value, selections) {
		this.value = value;
		this.selections = selections;
		this.focused = false;
	}

	listSelections() {
		return this.selections;
	}

	posToOffset(position) {
		const lines = this.value.split("\n");
		let offset = 0;

		for (let lineIndex = 0; lineIndex < position.line; lineIndex += 1) {
			offset += lines[lineIndex].length + 1;
		}

		return offset + position.ch;
	}

	getValue() {
		return this.value;
	}

	transaction(transaction) {
		let value = "";
		let nextSliceStart = 0;

		for (const change of transaction.changes) {
			const fromOffset = this.posToOffset(change.from);
			const toOffset = this.posToOffset(change.to);
			value += this.value.slice(nextSliceStart, fromOffset) + change.text;
			nextSliceStart = toOffset;
		}

		this.value = value + this.value.slice(nextSliceStart);
		this.selections = transaction.selections;
	}

	focus() {
		this.focused = true;
	}
}
