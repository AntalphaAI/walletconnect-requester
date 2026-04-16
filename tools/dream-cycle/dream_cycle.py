#!/usr/bin/env python3
"""
Dream Cycle — Brain Entity Maintenance Tool
Inspired by GBrain's nightly maintenance protocol.

Scans brain/ directory for:
1. Entity Sweep: find entities mentioned but not created
2. Backlink Check: verify [[entity]] links are valid
3. Lint: check formatting issues (missing metadata, empty sections)
4. Consolidation: detect duplicates, long files needing compression

Usage:
  python3 dream_cycle.py sweep     — Find new entities mentioned but not in brain/
  python3 dream_cycle.py backlinks — Check [[entity]] links are valid
  python3 dream_cycle.py lint      — Check formatting issues
  python3 dream_cycle.py report    — Full maintenance report (all checks)
"""

import os
import re
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple

# Paths
BRAIN_DIR = Path(os.path.expanduser("~/.openclaw/workspace/brain"))
MEMORY_DIR = Path(os.path.expanduser("~/.openclaw/workspace/memory"))
REPORTS_DIR = BRAIN_DIR / "reports" / "dream-cycle"

# Entity types and their directories
ENTITY_TYPES = {
    "people": "people",
    "companies": "companies",
    "projects": "projects",
    "concepts": "concepts",
    "contacts": "contacts",
}

# Directories to skip during scanning
SKIP_DIRS = {"reports", "dream-cycle"}

def get_all_brain_files() -> List[Path]:
    """Get all .md files in brain/ directory (excluding reports)."""
    files = []
    for dirpath, dirnames, filenames in os.walk(BRAIN_DIR):
        # Skip reports and other non-entity directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            if f.endswith(".md"):
                files.append(Path(dirpath) / f)
    return files

def get_all_memory_files() -> List[Path]:
    """Get recent .md files in memory/ directory (last 7 days)."""
    files = []
    if not MEMORY_DIR.exists():
        return files
    for f in MEMORY_DIR.glob("*.md"):
        files.append(f)
    return files

def get_known_entities() -> Dict[str, str]:
    """Get all known entities (filename without .md -> relative path)."""
    entities = {}
    for entity_dir in ENTITY_TYPES.values():
        dir_path = BRAIN_DIR / entity_dir
        if not dir_path.exists():
            continue
        for f in dir_path.glob("*.md"):
            name = f.stem.lower().replace("-", " ").replace("_", " ")
            entities[name] = str(f.relative_to(BRAIN_DIR))
            # Also add the original filename
            entities[f.stem] = str(f.relative_to(BRAIN_DIR))
    return entities

def extract_wikilinks(content: str) -> List[str]:
    """Extract [[entity]] links from content."""
    pattern = r'\[\[([^\]]+)\]\]'
    return re.findall(pattern, content)

def extract_entity_mentions(content: str, known_entities: Dict[str, str]) -> List[str]:
    """Find entity-like mentions (capitalized words/phrases) not in known entities."""
    # Simple heuristic: find capitalized words that could be entity names
    # Filter out common words, markdown syntax, etc.
    common_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "can", "shall", "must",
        "and", "but", "or", "nor", "for", "yet", "so", "if", "then",
        "when", "where", "while", "although", "because", "since",
        "this", "that", "these", "those", "here", "there",
        "markdown", "md", "http", "https", "www", "com", "org", "io",
        "function", "class", "def", "import", "from", "return",
        "type", "status", "version", "path", "file", "name", "value",
        "note", "notes", "todo", "fix", "bug", "error", "ok", "yes", "no",
        "step", "phase", "task", "test", "run", "config", "data", "api",
    }

    # Find potential entity names: 2+ capitalized words, or single proper nouns
    candidates = set()

    # Multi-word entities (e.g., "OpenClaw", "Web3 Investor")
    multi_word = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', content)
    candidates.update(multi_word)

    # Single proper nouns (capitalized, not at start of sentence)
    # Look for words after non-period characters
    lines = content.split('\n')
    for line in lines:
        words = line.split()
        for i, word in enumerate(words):
            clean = re.sub(r'[^\w]', '', word)
            if (len(clean) > 2 and clean[0].isupper() and
                clean.lower() not in common_words and
                not clean.startswith('0x') and
                clean not in ('The', 'A', 'An', 'In', 'On', 'At', 'To', 'For',
                             'By', 'With', 'From', 'Up', 'About', 'Into', 'As')):
                # Not at start of sentence (heuristic)
                if i > 0 or len(words) > 1:
                    candidates.add(clean)

    # Filter out known entities
    known_lower = {k.lower() for k in known_entities.keys()}
    unknown = [c for c in candidates if c.lower() not in known_lower]

    # Additional noise filter: common capitalized words in code/logs
    noise_words = {
        'Key', 'Session', 'Source', 'UTC', 'Summary', 'Conversation',
        'GMT8', 'GLM', 'Sender', 'SKILLmd', 'Skill', 'Agent', 'Markdown',
        'Status', 'Type', 'Error', 'Warning', 'Step', 'Phase', 'Task',
        'Test', 'Config', 'Data', 'API', 'Function', 'Class', 'Return',
        'Import', 'Value', 'File', 'Name', 'Path', 'Command', 'Tool',
        'Result', 'Output', 'Input', 'Message', 'Content', 'Timestamp',
        'Check', 'Report', 'Model', 'Network', 'Chain', 'Token', 'Price',
        'Amount', 'Address', 'Hash', 'Order', 'Product', 'Trade', 'Swap',
    }
    unknown = [c for c in unknown if c not in noise_words]

    return sorted(unknown)

# =====================================================================
# Command: sweep
# =====================================================================
def cmd_sweep():
    """Entity Sweep: find entities mentioned in brain/memory but not created."""
    known = get_known_entities()
    brain_files = get_all_brain_files()
    memory_files = get_all_memory_files()

    mentions = {}  # entity_name -> [source_files]

    # Scan brain files
    for fpath in brain_files:
        content = fpath.read_text(encoding='utf-8')
        found = extract_entity_mentions(content, known)
        for entity in found:
            mentions.setdefault(entity, []).append(str(fpath.relative_to(BRAIN_DIR.parent)))

    # Scan recent memory files
    for fpath in memory_files:
        content = fpath.read_text(encoding='utf-8')
        found = extract_entity_mentions(content, known)
        for entity in found:
            mentions.setdefault(entity, []).append(str(fpath.relative_to(MEMORY_DIR.parent)))

    # Filter: only entities mentioned 2+ times (avoid noise)
    frequent = {k: v for k, v in mentions.items() if len(v) >= 2}

    result = {
        "command": "sweep",
        "timestamp": datetime.now().isoformat(),
        "known_entities": len(known),
        "total_unknown_mentions": len(mentions),
        "frequent_mentions": len(frequent),
        "entities": {k: {"count": len(v), "sources": v[:5]} for k, v in
                     sorted(frequent.items(), key=lambda x: -len(x[1]))[:20]}
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

# =====================================================================
# Command: backlinks
# =====================================================================
def cmd_backlinks():
    """Backlink Check: verify [[entity]] links point to existing files."""
    known = get_known_entities()
    brain_files = get_all_brain_files()

    broken_links = []  # {source, link, line}
    valid_links = 0
    total_links = 0

    for fpath in brain_files:
        content = fpath.read_text(encoding='utf-8')
        links = extract_wikilinks(content)

        for link in links:
            total_links += 1
            # Try to find matching entity
            link_lower = link.lower().replace(" ", "-").replace("_", "-")
            found = False

            for entity_dir in ENTITY_TYPES.values():
                target = BRAIN_DIR / entity_dir / f"{link_lower}.md"
                if target.exists():
                    found = True
                    break
                # Also try exact name
                target = BRAIN_DIR / entity_dir / f"{link}.md"
                if target.exists():
                    found = True
                    break

            if found:
                valid_links += 1
            else:
                broken_links.append({
                    "source": str(fpath.relative_to(BRAIN_DIR)),
                    "link": link,
                    "suggestion": link_lower,
                })

    # Check for missing backlinks (entity A mentions B, but B doesn't mention A)
    missing_backlinks = []
    for fpath in brain_files:
        content = fpath.read_text(encoding='utf-8')
        links = extract_wikilinks(content)
        source_name = fpath.stem

        for link in links:
            link_lower = link.lower().replace(" ", "-").replace("_", "-")
            for entity_dir in ENTITY_TYPES.values():
                target = BRAIN_DIR / entity_dir / f"{link_lower}.md"
                if target.exists():
                    target_content = target.read_text(encoding='utf-8')
                    if f"[[{source_name}]]" not in target_content and \
                       f"[[{link}]]" not in target_content:
                        missing_backlinks.append({
                            "entity": link,
                            "file": str(target.relative_to(BRAIN_DIR)),
                            "missing_ref": source_name,
                        })
                    break

    result = {
        "command": "backlinks",
        "timestamp": datetime.now().isoformat(),
        "total_links": total_links,
        "valid_links": valid_links,
        "broken_links": len(broken_links),
        "missing_backlinks": len(missing_backlinks),
        "broken": broken_links[:20],
        "missing_backlinks_detail": missing_backlinks[:20],
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

# =====================================================================
# Command: lint
# =====================================================================
def cmd_lint():
    """Lint: check brain files for formatting issues."""
    brain_files = get_all_brain_files()

    issues = []  # {file, line, issue, severity}
    files_checked = 0

    for fpath in brain_files:
        if fpath.name == "INDEX.md":
            continue  # Skip index

        files_checked += 1
        content = fpath.read_text(encoding='utf-8')
        lines = content.split('\n')

        # Check 1: Missing H1 title
        has_h1 = any(line.startswith('# ') for line in lines)
        if not has_h1:
            issues.append({
                "file": str(fpath.relative_to(BRAIN_DIR)),
                "issue": "Missing H1 title",
                "severity": "warning",
            })

        # Check 2: Missing "基本信息" section
        if '## 基本信息' not in content and '## 基本' not in content:
            issues.append({
                "file": str(fpath.relative_to(BRAIN_DIR)),
                "issue": "Missing '基本信息' section",
                "severity": "warning",
            })

        # Check 3: Empty sections (section header followed immediately by another header)
        for i in range(len(lines) - 1):
            if lines[i].startswith('## ') and lines[i+1].startswith('## '):
                issues.append({
                    "file": str(fpath.relative_to(BRAIN_DIR)),
                    "line": i + 1,
                    "issue": f"Empty section: '{lines[i]}'",
                    "severity": "warning",
                })

        # Check 4: Broken [[links]] (malformed)
        bad_links = re.findall(r'\[\[(?!\[)[^\]]*$', content)
        for bl in bad_links:
            issues.append({
                "file": str(fpath.relative_to(BRAIN_DIR)),
                "issue": f"Malformed wikilink: '{bl}'",
                "severity": "error",
            })

        # Check 5: File too long (>200 lines) — may need compression
        if len(lines) > 200:
            issues.append({
                "file": str(fpath.relative_to(BRAIN_DIR)),
                "issue": f"File too long ({len(lines)} lines), consider compression",
                "severity": "info",
            })

        # Check 6: Missing "最后更新" field
        if '最后更新' not in content:
            issues.append({
                "file": str(fpath.relative_to(BRAIN_DIR)),
                "issue": "Missing '最后更新' field",
                "severity": "info",
            })

    result = {
        "command": "lint",
        "timestamp": datetime.now().isoformat(),
        "files_checked": files_checked,
        "total_issues": len(issues),
        "errors": len([i for i in issues if i["severity"] == "error"]),
        "warnings": len([i for i in issues if i["severity"] == "warning"]),
        "info": len([i for i in issues if i["severity"] == "info"]),
        "issues": issues[:30],
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result

# =====================================================================
# Command: report
# =====================================================================
def cmd_report():
    """Full Dream Cycle report: sweep + backlinks + lint."""
    print("=" * 60, file=sys.stderr)
    print("🧠 Dream Cycle — Nightly Brain Maintenance", file=sys.stderr)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    sweep_result = cmd_sweep()
    print("\n" + "-" * 40 + "\n", file=sys.stderr)

    backlink_result = cmd_backlinks()
    print("\n" + "-" * 40 + "\n", file=sys.stderr)

    lint_result = cmd_lint()

    # Save report
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_name = datetime.now().strftime("%Y-%m-%d-%H%M") + ".md"
    report_path = REPORTS_DIR / report_name

    report_content = f"""# Dream Cycle Report — {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Summary

| Check | Result |
|-------|--------|
| Known Entities | {sweep_result['known_entities']} |
| New Entity Candidates | {sweep_result['frequent_mentions']} |
| Broken Links | {backlink_result['broken_links']} |
| Missing Backlinks | {backlink_result['missing_backlinks']} |
| Lint Errors | {lint_result['errors']} |
| Lint Warnings | {lint_result['warnings']} |

## New Entity Candidates (mentioned 2+ times)

"""
    for entity, info in sweep_result.get('entities', {}).items():
        sources = ', '.join(info['sources'][:3])
        report_content += f"- **{entity}** ({info['count']}x) — {sources}\n"

    report_content += "\n## Broken Links\n\n"
    for bl in backlink_result.get('broken', []):
        report_content += f"- `{bl['source']}` → `[[{bl['link']}]]` (not found)\n"

    report_content += "\n## Missing Backlinks\n\n"
    for mb in backlink_result.get('missing_backlinks_detail', []):
        report_content += f"- `{mb['file']}` should reference `[[{mb['missing_ref']}]]`\n"

    report_content += "\n## Lint Issues\n\n"
    for issue in lint_result.get('issues', []):
        line_info = f" (line {issue['line']})" if 'line' in issue else ""
        report_content += f"- [{issue['severity'].upper()}] `{issue['file']}`{line_info}: {issue['issue']}\n"

    report_path.write_text(report_content, encoding='utf-8')

    print(f"\n📄 Report saved: {report_path}", file=sys.stderr)

    # Output combined JSON to stdout
    combined = {
        "report": str(report_path),
        "sweep": sweep_result,
        "backlinks": backlink_result,
        "lint": lint_result,
    }
    # Already printed individual results, just note completion
    return combined

# =====================================================================
# Main
# =====================================================================
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    commands = {
        "sweep": cmd_sweep,
        "backlinks": cmd_backlinks,
        "lint": cmd_lint,
        "report": cmd_report,
    }

    if command not in commands:
        print(f"Unknown command: {command}")
        print(f"Available: {', '.join(commands.keys())}")
        sys.exit(1)

    commands[command]()

if __name__ == "__main__":
    main()
