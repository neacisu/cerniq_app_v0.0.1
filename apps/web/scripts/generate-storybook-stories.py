#!/usr/bin/env python3
"""
Generează fișiere *.stories.tsx lângă fiecare componentă din src/components.
Rulare: python3 scripts/generate-storybook-stories.py [--dry-run]
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = ROOT / "src" / "components"

# Titluri Storybook: Cerniq/<Subfolder>/.../<Name>
# Override manual (path relativ la COMPONENTS) — folosit doar dacă lipsește fișierul țintă.
SPECIAL: dict[str, str] = {}


def find_export_name(file_path: Path, text: str) -> str:
    stem = file_path.stem
    memo = re.search(r"export const (\w+)\s*=\s*memo\(function", text)
    if memo:
        return memo.group(1)
    names = re.findall(r"export function (\w+)\s*\(", text)
    if not names:
        names = re.findall(r"export const (\w+)\s*=\s*\(", text)
    if not names:
        return stem
    if stem in names:
        return stem
    cand = f"{stem}Component"
    if cand in names:
        return cand
    for n in names:
        if n.endswith("Component") and stem.lower() in n.lower():
            return n
    for n in names:
        if n.startswith(stem) or stem in n:
            return n
    return names[0]


def story_title(rel: Path) -> str:
    parts = list(rel.parts[:-1]) + [rel.stem]
    return "Cerniq/" + "/".join(parts)


def default_story_content(rel: Path, export_name: str) -> str:
    title = story_title(rel)
    imp = f"./{rel.name}".replace(".tsx", ".js")
    return f"""// @ts-nocheck — Storybook 10: CSF strict args vs. componente fără props / forwardRef
import type {{ Meta, StoryObj }} from "@storybook/react-vite";
import type {{ ComponentProps }} from "react";
import {{ {export_name} }} from "{imp}";

const meta = {{
  title: "{title}",
  component: {export_name},
  tags: ["autodocs"],
  parameters: {{
    docs: {{
      description: {{
        component:
          "Story generat automat. Ajustează args sau `parameters.msw` pentru date reale.",
      }},
    }},
  }},
}} satisfies Meta<typeof {export_name}>;

export default meta;
type Story = StoryObj<typeof meta>;
type Props = ComponentProps<typeof {export_name}>;

export const Default = {{
  name: "Implicit",
  render: (args: Props) => <{export_name} {{...args}} />,
}} as unknown as Story;
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="Rescrie și fișiere existente")
    args = ap.parse_args()
    n = 0
    for path in sorted(COMPONENTS.rglob("*.tsx")):
        if ".stories." in path.name:
            continue
        rel = path.relative_to(COMPONENTS)
        # UI + ErrorBoundary: stories scrise manual (calitate, args, interacțiuni)
        if rel.parts[0] == "ui" or (
            rel.parts[0] == "feedback" and path.stem == "ErrorBoundary"
        ):
            continue
        key = str(rel).replace("\\\\", "/")
        out = path.with_suffix(".stories.tsx")
        if out.exists() and not args.force:
            continue
        if key in SPECIAL:
            body = SPECIAL[key]
        else:
            text = path.read_text(encoding="utf-8")
            export_name = find_export_name(path, text)
            body = default_story_content(rel, export_name)
        if args.dry_run:
            print(out.relative_to(ROOT))
            n += 1
            continue
        out.write_text(body, encoding="utf-8")
        n += 1
    print(f"OK: {n} fișiere stories (sărite existente fără --force)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
