# Convert case

A small, dependency-free case converter for selected text, with support for multiple selections.

## Get started

Select text in a note, open the command palette, and run one of the **Convert case** commands.

To add a keyboard shortcut, open **Settings → Hotkeys** and search for **Convert case**.

## Available conversions

- Title case
- Upper case
- Lower case
- Swap case
- Camel case
- Pascal case
- snake_case
- kebab-case

## Development

Run the checks with:

```bash
npm run check
```

The plugin is intentionally no-build. Obsidian loads `main.js` directly.

## Release

Run the release bump helper:

```bash
npm run release:patch
```

Use `release:minor`, `release:major`, or `npm run release:bump -- 0.2.0` when needed. Then run the git commands printed by the helper. Pushing the tag starts the GitHub release workflow.

## License

MIT
