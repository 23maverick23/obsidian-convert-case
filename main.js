"use strict";

const { Notice, Plugin } = require("obsidian");

const COMMANDS = [
	{
		id: "title-case",
		name: "Title case",
		transform: toTitleCase,
	},
	{
		id: "upper-case",
		name: "Upper case",
		transform: (text) => text.toUpperCase(),
	},
	{
		id: "lower-case",
		name: "Lower case",
		transform: (text) => text.toLowerCase(),
	},
	{
		id: "swap-case",
		name: "Swap case",
		transform: toSwapCase,
	},
	{
		id: "camel-case",
		name: "Camel case",
		transform: (text) => toIdentifierCase(text, toCamelCase),
	},
	{
		id: "pascal-case",
		name: "Pascal case",
		transform: (text) => toIdentifierCase(text, toPascalCase),
	},
	{
		id: "snake-case",
		name: "snake_case",
		transform: (text) => toIdentifierCase(text, toSnakeCase),
	},
	{
		id: "kebab-case",
		name: "kebab-case",
		transform: (text) => toIdentifierCase(text, toKebabCase),
	},
];

class ConvertCasePlugin extends Plugin {
	onload() {
		for (const command of COMMANDS) {
			this.addCommand({
				id: command.id,
				name: command.name,
				editorCheckCallback: (checking, editor) => {
					if (checking) {
						return true;
					}

					if (!replaceSelections(editor, command.transform)) {
						new Notice("Select text to convert.");
					}

					return true;
				},
			});
		}
	}
}

function replaceSelections(editor, transform) {
	const selections = editor
		.listSelections()
		.map((selection) => normalizeSelection(editor, selection))
		.filter((selection) => selection.fromOffset !== selection.toOffset)
		.sort((a, b) => a.fromOffset - b.fromOffset);

	if (selections.length === 0) {
		return false;
	}

	const originalText = editor.getValue();
	const changes = [];
	const replacedRanges = [];
	let nextSliceStart = 0;
	let offsetDelta = 0;
	let updatedText = "";

	for (const selection of selections) {
		const selectedText = originalText.slice(selection.fromOffset, selection.toOffset);
		const replacement = transform(selectedText);
		const updatedFromOffset = selection.fromOffset + offsetDelta;
		const updatedToOffset = updatedFromOffset + replacement.length;

		updatedText += originalText.slice(nextSliceStart, selection.fromOffset);
		updatedText += replacement;
		nextSliceStart = selection.toOffset;
		offsetDelta += replacement.length - selectedText.length;

		changes.push({
			from: selection.from,
			to: selection.to,
			text: replacement,
		});
		replacedRanges.push({
			fromOffset: updatedFromOffset,
			toOffset: updatedToOffset,
		});
	}

	updatedText += originalText.slice(nextSliceStart);

	const lineStarts = getLineStarts(updatedText);
	const updatedSelections = replacedRanges.map((range) => ({
		from: offsetToPosition(lineStarts, range.fromOffset),
		to: offsetToPosition(lineStarts, range.toOffset),
	}));

	editor.transaction(
		{
			changes,
			selections: updatedSelections,
		},
		"convert-case",
	);
	editor.focus();

	return true;
}

function normalizeSelection(editor, selection) {
	const anchorOffset = editor.posToOffset(selection.anchor);
	const headOffset = editor.posToOffset(selection.head);

	if (anchorOffset <= headOffset) {
		return {
			from: selection.anchor,
			to: selection.head,
			fromOffset: anchorOffset,
			toOffset: headOffset,
		};
	}

	return {
		from: selection.head,
		to: selection.anchor,
		fromOffset: headOffset,
		toOffset: anchorOffset,
	};
}

function getLineStarts(text) {
	const starts = [0];

	for (let index = 0; index < text.length; index += 1) {
		if (text.charCodeAt(index) === 10) {
			starts.push(index + 1);
		}
	}

	return starts;
}

function offsetToPosition(lineStarts, offset) {
	let low = 0;
	let high = lineStarts.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);

		if (lineStarts[mid] <= offset) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	const line = Math.max(0, high);
	return {
		line,
		ch: offset - lineStarts[line],
	};
}

function toTitleCase(text) {
	return text.replace(/[\p{L}\p{N}]+(?:[''][\p{L}\p{N}]+)*/gu, titleCaseWord);
}

function toSwapCase(text) {
	let output = "";

	for (const character of text) {
		const upper = character.toUpperCase();
		const lower = character.toLowerCase();

		if (upper === lower) {
			output += character;
		} else if (character === upper) {
			output += lower;
		} else {
			output += upper;
		}
	}

	return output;
}

function toIdentifierCase(text, formatter) {
	return text.replace(/[^\r\n]+/g, (line) => {
		const leadingWhitespace = line.match(/^\s*/)[0];
		const trailingWhitespace = line.match(/\s*$/)[0];
		const body = line.slice(leadingWhitespace.length, line.length - trailingWhitespace.length);
		const words = extractWords(body);

		if (words.length === 0) {
			return line;
		}

		return leadingWhitespace + formatter(words) + trailingWhitespace;
	});
}

function extractWords(text) {
	const separatedText = text
		.replace(/([\p{Lu}]+)([\p{Lu}][\p{Ll}])/gu, "$1 $2")
		.replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, "$1 $2");

	return separatedText.match(/[\p{L}\p{N}]+/gu) || [];
}

function titleCaseWord(word) {
	return capitalizeWord(word);
}

function capitalizeWord(word) {
	const lower = word.toLowerCase();
	const characters = Array.from(lower);

	if (characters.length === 0) {
		return "";
	}

	return characters[0].toUpperCase() + characters.slice(1).join("");
}

function toCamelCase(words) {
	const normalizedWords = words.map((word) => word.toLowerCase());

	return normalizedWords
		.map((word, index) => (index === 0 ? word : capitalizeWord(word)))
		.join("");
}

function toPascalCase(words) {
	return words.map(capitalizeWord).join("");
}

function toSnakeCase(words) {
	return words.map((word) => word.toLowerCase()).join("_");
}

function toKebabCase(words) {
	return words.map((word) => word.toLowerCase()).join("-");
}

module.exports = ConvertCasePlugin;

if (typeof window === "undefined") {
	module.exports.__test = {
		extractWords,
		COMMANDS,
		toCamelCase,
		toIdentifierCase,
		toKebabCase,
		replaceSelections,
		toPascalCase,
		toSnakeCase,
		toSwapCase,
		toTitleCase,
	};
}
