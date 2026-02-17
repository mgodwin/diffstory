# Diffstory

Diffstory is a Claude Code skill that transforms code diffs into interactive narrative HTML reviews.

## Project Structure

```
SKILL.md              # Claude instructions for generating diffstory JSON
VERSION               # Version string (e.g. "1.0.0"), injected into builds
templates/
  template.html       # Self-contained HTML template with embedded CSS + JS
scripts/
  build.js            # Builds final HTML: resolves lineMatch, injects JSON + version
  validate.js         # Schema validation for diffstory JSON
tests/
  build-test.sh       # Build + validate fixtures (--open, --render flags)
  render-test.js      # Playwright browser assertions against built HTML
  fixtures/*.json     # Test fixture data (3 fixtures)
```

## Build Pipeline

1. **Validate** — `node scripts/validate.js <file.json>` checks schema conformance
2. **Build** — `node scripts/build.js --data <file.json> --out <file.html>` produces a standalone HTML file:
   - Resolves `lineMatch` annotations to line numbers by parsing the diff
   - Injects the JSON analysis data into the template placeholder
   - Stamps the version from `VERSION`

## Key Conventions

- **lineMatch over line numbers**: Annotations use `lineMatch` (a code substring) instead of manual line numbers. The build script resolves these. This avoids LLM line-counting errors.
- **Placeholder format**: The template contains `/*__DIFFSTORY_ANALYSIS_PLACEHOLDER__*/null`. The build replaces it (including the trailing `null`) with the JSON data.
- **Annotation rendering**: Annotations render immediately after their target diff line (not deferred to the next loop iteration).

## Testing

### Quick validation + build
```bash
tests/build-test.sh                    # validate + build all fixtures
tests/build-test.sh minimal-expert     # just one fixture
```

### With browser render tests
```bash
tests/build-test.sh --render           # build then run Playwright assertions
tests/build-test.sh --render --open    # build, test, then open in browser
```

### Render tests standalone
```bash
node tests/render-test.js              # test all built HTML files
node tests/render-test.js full-newcomer # test one fixture
```

Render tests require Playwright + Chromium. Install with:
```bash
npm install && npx playwright install chromium
```

### Fixtures

| Fixture | Purpose |
|---------|---------|
| `minimal-expert` | Sparse: 1 narrative, 1 step, no optional sections |
| `full-newcomer` | All optional fields: bigPicture, glossary, dataFlow, testCoverage |
| `multi-narrative` | 3 narrative tabs with varying step counts |

### What render tests check

- No JS console errors (shiki CDN errors on `file://` are filtered)
- Version attribute and tag present
- Tab bar structure (Overview + narratives)
- Overview elements (title, progress bar, badges)
- Fixture-specific elements (disclosure sections, coverage, glossary, annotations)
- Tab switching renders correct step/hunk counts
- Annotation types render with correct CSS classes
