# Bright Office V2 Backlog

Deferred, non-release items. None of these block V1; do not work on them
without an explicit V2 mandate. Visual items must follow the locked art recipe
(`docs/` style-lock notes) if they generate anything.

## Visual fidelity (accepted V1 gaps)

- Closer overall match to the reference image (tower proportions, palette,
  composition rhythm).
- Better tower shell — closer to the reference building silhouette/materials.
- Better company card thumbnails (true miniature renders instead of stylized
  mini towers).
- Higher worker density per floor (reference shows more staff per room).
- Bottom storyboard closer to the exact reference panel set.
- Improved Idle Time scenes (more variety, richer props).

## Content

- Bright character sets for more department types (Legal, Finance, HR, Sales,
  Support, Research, Operations, Security, Data currently use the neutral
  interior + generic worker).
- Per-type floor art for departments beyond the six shipped types.
- Richer animations (walk cycles, seat transitions, elevator, day/night).

## UX / platform

- Dedicated mobile layout for the office view (current mobile is a functional
  stacked fallback).
- Smooth floor-window scrolling animation for 7–15 department towers.
- Real VPS integration to replace the mock/demo panel.

## Backend housekeeping

- Cascade agent deletion when a company is deleted (agents currently must be
  deleted individually; departments and projects already cascade).
- Optional: return 404-safe company lookup endpoint (`GET /companies/{id}` is
  fine, but a lightweight `exists` check could simplify clients).

## P2 polish observed during release testing (cosmetic, non-blocking)

- Minor spacing/text imbalance at some widths.
- Animation timing uniformity across floors.
- Thumbnail aesthetics on the company rail.
