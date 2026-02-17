# Diffstory

Diffstory is a Claude Code skill that transforms code diffs into interactive narrative reviews. It takes a PR, MR, or git ref and generates a self-contained HTML file where changes are organized into logical stories with syntax-highlighted diffs, inline annotations, and a progress tracker.

## Usage

```bash
# GitHub PR
/diffstory https://github.com/org/repo/pull/123

# GitLab MR
/diffstory https://gitlab.com/org/repo/-/merge_requests/456

# Local git diffs
/diffstory main..feature
/diffstory HEAD~3

# With explicit knowledge level
/diffstory --level=intermediate HEAD~1
```

## Knowledge Levels

| Level | Audience | What's included |
|-------|----------|-----------------|
| **none** | New to codebase | Big picture context, glossary, data flow diagrams, file explanations |
| **basic** | Occasional contributor | Module context, key relationships, moderate annotations |
| **intermediate** | Regular contributor | Focused technical summary, standard annotations |
| **expert** | Deep familiarity | Minimal prose, sparse annotations, just the changes |

If no level is specified, you'll be prompted to choose one.

## Output

The output is a single self-contained `.html` file in your current working directory named `diffstory-<session>-<source>.html`. It contains:

- **Overview tab** - Executive summary, criticality rating, and test coverage analysis
- **Narrative tabs** - Changes grouped into logical stories with ordered steps
- **Files tab** - All changed files listed with quick navigation
- **Prompt builder** - Select diffs to assemble a review prompt for follow-up questions
- **Progress tracker** - Mark hunks as reviewed; progress persists in localStorage

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- `gh` CLI for GitHub PRs (`gh auth login` to authenticate)
- `glab` CLI for GitLab MRs (`glab auth login` to authenticate)
- A modern browser to view the output

## .gitignore

Add this to your `.gitignore` to keep generated files out of version control:

```
diffstory-*.html
```
