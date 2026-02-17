# Changelog

## 1.0.0 — 2026-02-06

### Fixed
- `}null;` syntax error in generated HTML caused by placeholder replacement not including the trailing `null`

### Added
- `scripts/validate.js` — standalone schema validation (extracted from inline SKILL.md)
- `scripts/build.js` — standalone HTML builder with bug fix and version injection (extracted from inline SKILL.md)
- Version display (`v1.0.0`) in tab bar, `data-diffstory-version` attribute on `<html>` tag
- `VERSION` file for single-source version tracking
- Test fixtures: `minimal-expert.json`, `full-newcomer.json`, `multi-narrative.json`
- `tests/build-test.sh` — builds all fixtures, supports `--open` flag

### Changed
- SKILL.md now calls external scripts instead of inline `node -e` blocks
