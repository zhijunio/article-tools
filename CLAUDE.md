# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of lightweight, browser-based tools for content creation (cover images, Markdown to WeChat official account formatter, QR codes). All tools run entirely in the browser with no backend. The entire site can be deployed on GitHub Pages.

**Live preview:** https://zhijunio.github.io/article-tools/

## Commands

```bash
# Serve a tool locally (required for fetch() to load sample.md)
cd md
python3 -m http.server 8080
# Access: http://127.0.0.1:8080/ or http://127.0.0.1:8080/index.html

# Same pattern applies to other tools (cover/, studio/, qrcode/)
```

## Architecture

**Monorepo layout:** Each tool lives in its own directory and is completely self-contained:

```
article-tools/
├── index.html          # Landing page with tool cards
├── cover/              # Cover image generator
├── md/                 # Markdown → WeChat Official Account formatter
├── studio/             # Advanced WeChat article studio (V6)
├── qrcode/             # QR code generator & parser
└── docs/               # Screenshots for README
```

**Tool anatomy:** Each tool directory contains:
- `index.html` — Entry point, script includes, CDN dependencies
- `index.css` — Layout and UI styles
- `index.js` — Main application logic
- `index.presets.js` — (if applicable) Style presets and theme configurations
- `index.renderer.js` — (if applicable) Rendering logic (e.g., Markdown → HTML)

**Dependencies:** All external libraries load from jsDelivr CDN (marked, highlight.js, Turndown). No npm, no bundlers, no build step.

**WeChat Official Account constraints:** Output HTML must use inline styles only. Allowed: `<section>`, `<p>`, `<h1>`-`<h3>`, `<img>`, `<strong>`, `<em>`, inline CSS properties. Disallowed: `<style>` tags, class selectors, `position`, `box-shadow`, `linear-gradient`, CSS variables, animations.

## Key Files

| File | Purpose |
|------|---------|
| `md/index.renderer.js` | `renderMarkdown()` — Markdown to inline-styled HTML |
| `md/index.presets.js` | `PRESETS` (element styles), `THEMES` (color palettes) |
| `studio/` | Advanced editor with 12 styles, 5 image roles, extended Markdown syntax |

## Development Notes

- Tools must be served via HTTP (not `file://`) for `fetch()` calls to work (e.g., loading `sample.md`)
- No build pipeline — edit files directly and refresh browser
- Images in `md/` are stored in IndexedDB (database: `WechatEditorImages`)
