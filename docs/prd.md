# PRD (MVP)

## Goal
Build a universal long-screenshot tool, optimized for Feishu Docs, to generate social-share-ready images.

## Core Requirements
- Capture full page or selected area.
- Support max output height.
- Export single long image or auto-split into 3/6/9 images.
- Allow attaching one Feishu URL as a footer (none/last/all pages).

## Target Users
- Content creators sharing knowledge notes.
- Operators sharing doc summaries.
- Office users sharing meeting highlights.

## MVP Scope
- Chromium extension only.
- Local processing only (no cloud upload).
- PNG export.

## Success Metrics
- Capture success rate > 95% on Feishu docs.
- Export failure rate < 2%.
- Average operation <= 3 steps.

## Known Limits
- Very complex sticky layouts may still require retry.
- QR code generation is not in v1.
