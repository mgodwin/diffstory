---
name: diffstory
description: Generate an interactive diff review HTML with narrative structure. Use for PR/MR review or git diff analysis.
allowed-tools: Bash(gh:*), Bash(glab:*), Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Write, Read, Bash(open:*), Bash(node:*), Task
---

# Diffstory - Interactive Diff Review

Generate an interactive HTML artifact that presents code changes as a narrative story, making PR/MR review more intuitive and thorough.

## When to Use

- Reviewing GitHub PRs: `/diffstory https://github.com/org/repo/pull/123`
- Reviewing GitLab MRs: `/diffstory https://gitlab.com/org/repo/-/merge_requests/123`
- Reviewing local git diffs: `/diffstory main..feature` or `/diffstory HEAD~3`

### Knowledge Level Option

Tailor the review to the audience's familiarity with the codebase:

```bash
# Explicit level (skips prompt)
/diffstory --level=none https://github.com/org/repo/pull/123
/diffstory --level=basic https://github.com/org/repo/pull/123
/diffstory --level=intermediate https://github.com/org/repo/pull/123
/diffstory --level=expert https://github.com/org/repo/pull/123

# No level specified → prompt user interactively
/diffstory https://github.com/org/repo/pull/123
```

| Level | Who | Content Approach |
|-------|-----|------------------|
| **none** | New to codebase | Full context: big picture, file explanations, glossary |
| **basic** | Occasional contributor | Module context, key relationships, moderate annotations |
| **intermediate** | Regular contributor | Focused technical summary, standard annotations |
| **expert** | Deep familiarity | Minimal prose, sparse annotations, just the changes |

## Workflow

### Step 1: Parse Arguments and Fetch Diff

**First, parse the arguments:**
1. Check for `--level=<level>` in the args (none, basic, intermediate, expert)
2. If no level specified, ask the user interactively:
   - "What's your familiarity with this codebase?"
   - Options: No knowledge, Basic, Intermediate, Expert
3. Store the level for use in Step 2 analysis

**Then, determine the diff source. IMPORTANT: You MUST checkout the code FIRST before fetching the diff or doing any codebase exploration. The Explore agent in Step 1b reads local files, so the working tree must be on the correct branch.**

**GitHub PR URL** (contains `github.com` and `/pull/`):
```bash
# 1. Checkout FIRST — required before any other step
gh pr checkout <number>

# 2. Then fetch diff and metadata
BASE=$(gh pr view <number> --json baseRefName -q '.baseRefName')
git diff $BASE...HEAD
gh pr view <number> --json title,body,baseRefName
```

**GitLab MR URL** (contains `gitlab.com` and `/merge_requests/`):
```bash
# 1. Checkout FIRST
glab mr checkout <number>

# 2. Then fetch diff and metadata
glab mr diff <number>
glab mr view <number>
```

**Git ref** (like `main..feature`, `HEAD~3`, or commit ranges):
```bash
git diff <ref>
git log --oneline <ref>
```

### Step 1b: Explore for Side Effects

Use an **Explore subagent** to investigate the ripple effects of the changes before writing your analysis. Launch it via the Task tool with `subagent_type: "Explore"`.

Give the Explore agent a prompt like:

> "For each file and function modified in this diff, find callers, consumers, and dependents in the codebase. Identify: (1) other files that import or call the changed functions/classes, (2) interfaces or types that changed and where they're used, (3) config or schema changes that downstream code may depend on, (4) any tests that exercise the changed code paths. Report each finding as: area (e.g. 'API consumers', 'test suite', 'CLI commands'), what's affected, and severity (high/medium/low)."

Include the list of changed files and key function/type names from the diff in the prompt so the agent knows what to search for.

Use the agent's findings to populate the `sideEffects` field in your analysis.

### Step 2: Analyze the Diff

Analyze the diff and produce a structured JSON analysis. The analysis should:

1. **Group related changes into narratives** (usually 1-3 for a typical PR)
2. **Order steps within each narrative** to tell a logical story
3. **Add annotations sparingly** - focus on genuinely interesting observations:
   - `provocation`: Thought-provoking observations or subtle implications
   - `risk`: Potential bugs, edge cases, or security concerns
   - `edge_case`: Boundary conditions or unusual inputs to consider
   - `alternative`: Different approaches worth considering
   - `question`: Things the reviewer should verify or think about

4. **Run the critique panel** — See **Step 2a** below.

   Use `optimal` only when the approach is genuinely the best available option. Default toward `acceptable` — most PRs work but aren't perfect. Use `suboptimal` when you'd push back in a real review. Always include `alternatives` when the verdict is not `optimal`, describing concrete alternatives with honest trade-offs. This is about the overall PR strategy, distinct from line-level `alternative` annotations on specific code choices.

5. **Assess criticality** — Evaluate how much review attention this PR deserves based on signals visible in the diff:
   - **High**: Security-sensitive code (auth, crypto, input validation), data persistence or migration changes, payment/billing logic, infrastructure config (CI, deploy, permissions), modifications to heavily-shared code (middleware, base classes, core utilities)
   - **Medium**: Public API changes, new feature logic with external impact, dependency updates, error handling changes, changes to code with many callers
   - **Low**: Documentation, test-only changes, dev tooling, new isolated code with no existing callers, cosmetic refactors, config tweaks

   The `explanation` should state what signals led to the level. The `risks` list should name specific things that could go wrong if this code has a bug.

6. **Use markdown** in summaries and blurbs - **bold**, *italics*, `code`, and lists where helpful

### Step 2a: Critique Panel

Before writing the `approachEvaluation`, launch **5 parallel subagents** to analyze the change from orthogonal perspectives. Use the Task tool with `subagent_type: "general-purpose"` and send **all 5 in a single message** so they run concurrently.

Each agent receives: the full diff, PR title/description, commit messages, side-effect findings from Step 1b, and their role prompt. Agents have full codebase access and should search for callers, patterns, or related code to inform their analysis.

**The 5 roles:**

1. **Protective Maintainer** — *"Does this earn its permanent place in the codebase?"* Evaluate whether this change justifies its long-term maintenance cost. Consider: Does it create tech debt or lock in a pattern? Could the project be better off without it? Is the solution's blast radius proportional to the problem?

2. **Attacker** — *"What happens with adversarial input or unexpected timing?"* Look for security vulnerabilities, injection vectors, race conditions, resource exhaustion, and trust boundary violations. Consider auth bypasses, unsafe deserialization, and missing input validation.

3. **On-Call SRE** — *"When this breaks in production, how will I know and fix it?"* Evaluate observability (logging, metrics, alerts), failure modes, rollback safety, and graceful degradation. Consider: Will errors be distinguishable? Can this be feature-flagged?

4. **Specification Lawyer** — *"Where does implementation diverge from stated intent?"* Compare the PR description, commit messages, and ticket requirements against what the code actually does. Flag scope mismatches, unmentioned behavior changes, and undocumented side effects.

5. **Consumer** — *"If I didn't read the implementation, would I use this correctly?"* Evaluate the public API surface, error messages, documentation, naming, and defaults from the perspective of someone who only reads the function signatures and docs.

**Each agent responds with:**
```json
{ "concern": "The specific finding", "severity": "high | medium | low | none" }
```

**Synthesis:** Exclude agents with `severity: "none"` (no padding). Use the remaining findings to write `approachEvaluation.verdict`, `.summary`, `.perspectives[]`, and `.alternatives[]`. The `perspectives` array maps each non-none agent to a `{ role, concern, severity }` entry.

### Knowledge Level Adaptation

Adjust your analysis based on the reviewer's knowledge level.

**Always include** (all levels): `testCoverage` (when tests exist or are notably absent), `approachEvaluation`, `criticality` with `explanation` and `risks`.

**none (newcomer):**
- Include `bigPicture`: 2-3 paragraphs explaining what system/module this code belongs to
- Include `narrative.bigPicture`: 1-2 sentences per narrative explaining what it covers and why it matters
- Include `glossary`: Array of {term, definition} for domain-specific terms
- Include `fileContext` on each hunk: 1 sentence explaining what this file does
- Use simpler language, avoid assuming familiarity
- More annotations explaining "why" not just "what"

**basic:**
- Include `bigPicture` (shorter, 1 paragraph)
- Include `narrative.bigPicture` (1 sentence per narrative)
- Include `fileContext` only for non-obvious files
- Standard annotation density

**intermediate:**
- No `bigPicture`, `narrative.bigPicture`, `glossary`, or `fileContext`
- Standard annotation density focused on risks and edge cases

**expert:**
- Minimal `summary` (1 paragraph max, just what changed)
- Sparse annotations - only genuinely non-obvious observations
- No explanatory context (no `bigPicture`, `narrative.bigPicture`, `glossary`, `fileContext`)

### Step 3: Validate and Generate HTML Artifact

The current session ID is: ${CLAUDE_SESSION_ID}
Use the first 8 characters as a prefix in the output filename.

1. **Write analysis as pure JSON** to `/tmp/diffstory_data.json` (no variable assignment wrapper, just the JSON object).

2. **Validate the JSON structure:**
   ```bash
   node ~/.claude/skills/diffstory/scripts/validate.js /tmp/diffstory_data.json
   ```
   If validation fails, fix the JSON and re-validate before proceeding.

3. **Build the self-contained HTML file:**

   Compute the output filename from the session ID and source:
   - `SESSION_PREFIX` = first 8 characters of the session ID
   - `SOURCE_SLUG` = the diff source (PR URL, branch name, or git ref) with non-alphanumeric chars replaced by `-`, trimmed, last 30 chars

   ```bash
   node ~/.claude/skills/diffstory/scripts/build.js \
     --data /tmp/diffstory_data.json \
     --out "./diffstory-${SESSION_PREFIX}-${SOURCE_SLUG}.html"
   ```

4. **Open in browser:**
   ```bash
   open ./diffstory-*.html  # macOS (the file just created)
   ```

## JSON Schema

Your analysis must match this schema exactly:

```json
{
  "source": "PR URL, MR URL, or git ref",
  "title": "Brief title describing the changes",
  "knowledgeLevel": "none | basic | intermediate | expert",
  "criticality": {
    "level": "high | medium | low",
    "explanation": "What signals in this diff led to this level (see criteria in Step 2)",
    "risks": ["Specific thing that could go wrong 1", "Specific thing that could go wrong 2"]
  },
  "approachEvaluation": {
    "verdict": "optimal | acceptable | suboptimal",
    "summary": "Synthesized assessment incorporating findings from all perspectives.",
    "perspectives": [
      {
        "role": "maintainer | security | sre | spec | consumer",
        "concern": "The specific finding from this perspective",
        "severity": "high | medium | low"
      }
    ],
    "alternatives": [
      {
        "title": "Short name for alternative approach",
        "description": "Why this might be better, trade-offs, and long-term implications"
      }
    ]
  },
  "summary": "Executive summary of the changes (2-3 paragraphs, markdown supported)",
  "bigPicture": "Optional - what does this system/module do? (for none/basic levels)",
  "glossary": [
    {
      "term": "domain term",
      "definition": "plain English definition"
    }
  ],
  "sideEffects": [
    {
      "area": "Area affected (e.g. 'API consumers', 'CLI commands', 'test suite')",
      "description": "What's affected and how — be specific about files, callers, or dependents",
      "severity": "high | medium | low"
    }
  ],
  "testCoverage": [
    {
      "file": "path/to/file.ts",
      "function": "functionName",
      "status": "covered | partial | uncovered",
      "testLocation": "path/to/test.ts (optional)",
      "notes": "any notes about coverage"
    }
  ],
  "narratives": [
    {
      "id": "narrative-1",
      "title": "Short tab title",
      "bigPicture": "Optional - plain language overview of what this narrative covers and why it matters (for none/basic levels)",
      "summary": "1-2 sentence explanation of what this narrative achieves and why",
      "steps": [
        {
          "id": "step-1",
          "title": "Short step title",
          "blurb": "2-3 sentences explaining what this step does and why",
          "hunks": [
            {
              "id": "hunk-1",
              "file": "path/to/file.ts",
              "startLine": 10,
              "endLine": 25,
              "diff": "the raw diff content for this hunk (unified diff format)",
              "fileContext": "Optional - 1 sentence explaining what this file does (for none/basic levels)",
              "annotations": [
                {
                  "id": "ann-1",
                  "type": "provocation | risk | edge_case | alternative | question",
                  "lineMatch": "distinctive code from the target line",
                  "content": "Annotation text (appears BELOW the matched line)"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Important Notes on Diff Format

- The `diff` field in each hunk should contain the raw unified diff output
- Include the `@@` hunk headers so line numbers can be parsed
- Each hunk should be a logical unit (one change concept)
- The `startLine` should match the `+` line number from the `@@` header
- **Annotation placement**: Use `lineMatch` with a distinctive substring from the target line's code (e.g. `"lineMatch": "pointer-events: none"`). The build script resolves this to the correct line number automatically. Do NOT manually count line numbers — `lineMatch` is far more reliable. The annotation will be displayed **below** the matched line in the rendered output. The match is scoped per-hunk, so the substring only needs to be unique within that hunk. If a line appears multiple times (e.g. repeated error handling), include enough surrounding context to disambiguate (e.g. `"if (!user)"` instead of `"Invalid credentials"`)

## Edge Cases

- **Large diffs** (>5000 lines): Warn the user that narrative analysis works best on focused changes. Suggest reviewing specific files or a smaller commit range.
- **Binary files**: Show placeholder "Binary file changed" in the diff field.
- **Auth failures**: If `gh` or `glab` commands fail with auth errors, inform the user to run `gh auth login` or `glab auth login`.
- **Empty diff**: Inform the user that there are no changes to review.

## Output Location

Output is a single self-contained HTML file written to the current working directory:
- `diffstory-<session-8>-<source-slug>.html` - Self-contained HTML with embedded analysis data
- Different sessions or different sources produce different files (no accidental overwrite)
- Same session + same source overwrites intentionally (re-run)
- Intermediate data in `/tmp/diffstory_data.json` is used only during build
- Consider adding `diffstory-*.html` to your `.gitignore`
