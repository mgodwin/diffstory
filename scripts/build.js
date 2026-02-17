#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Parse args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

const dataPath = getArg('--data');
const outPath = getArg('--out');

if (!dataPath || !outPath) {
  console.error('Usage: node build.js --data <json-path> --out <output-path>');
  process.exit(1);
}

const scriptDir = __dirname;
const tmplPath = path.join(scriptDir, '..', 'templates', 'template.html');
const versionPath = path.join(scriptDir, '..', 'VERSION');

const tmpl = fs.readFileSync(tmplPath, 'utf8');
const analysis = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const version = fs.readFileSync(versionPath, 'utf8').trim();

// --- Resolve lineMatch annotations to line numbers ---

function buildLineMap(diff, startLine) {
  const lines = diff.split('\n');
  const map = [];
  let lineNum = startLine;

  lines.forEach(line => {
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      if (m) lineNum = parseInt(m[1], 10);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      map.push({ lineNum, content: line.slice(1) });
      lineNum++;
    } else if (line.startsWith('-') || line.startsWith('---') || line.startsWith('+++')) {
      // deletion or file header — no new-file line number
    } else {
      // context line
      map.push({ lineNum, content: line });
      lineNum++;
    }
  });

  return map;
}

let resolved = 0, ambiguous = 0, unresolved = 0;

analysis.narratives.forEach(n => {
  n.steps.forEach(s => {
    s.hunks.forEach(h => {
      if (!h.annotations || h.annotations.length === 0) return;

      const lineMap = buildLineMap(h.diff, h.startLine);

      h.annotations.forEach(a => {
        if (!a.lineMatch) return;

        const matches = lineMap.filter(entry =>
          entry.content.includes(a.lineMatch)
        );

        if (matches.length === 1) {
          a.line = matches[0].lineNum;
          resolved++;
        } else if (matches.length > 1) {
          a.line = matches[0].lineNum;
          ambiguous++;
          console.warn(
            `Warning: annotation ${a.id} lineMatch "${a.lineMatch}" matched ${matches.length} lines in ${h.file} (using first: line ${a.line}). Use a more distinctive substring.`
          );
        } else {
          unresolved++;
          console.warn(
            `Warning: annotation ${a.id} lineMatch "${a.lineMatch}" not found in ${h.file}`
          );
        }
      });
    });
  });
});

if (resolved > 0 || ambiguous > 0 || unresolved > 0) {
  console.log(`Annotations resolved: ${resolved} ok, ${ambiguous} ambiguous, ${unresolved} unresolved`);
}
if (ambiguous > 0) {
  console.warn('Ambiguous matches use the first occurrence. Add more context to lineMatch to disambiguate.');
}

// --- Build HTML ---

const data = JSON.stringify(analysis);

// Escape </ for safe embedding in <script>
const safe = data.replace(/<\//g, '<\\/');

// Replace placeholder+null (the bug fix: target includes the trailing null)
let html = tmpl.replace('/*__DIFFSTORY_ANALYSIS_PLACEHOLDER__*/null', safe);

// Inject version
html = html.replace(/__DIFFSTORY_VERSION__/g, version);

fs.writeFileSync(outPath, html);
console.log(outPath);
