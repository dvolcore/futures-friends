#!/usr/bin/env python3
"""Refresh investor/publication-manifest.json `files`: bytes, sha256 and PDF page counts of every published investor file.

Run from the site root after any change under investor/:  python3 investor/tools/refresh_manifest.py
Keeps every other manifest field as written (figures, limits, aliases); lists every file under investor/ except the manifest itself.
tests/investor-portal.test.js fails when a listed file no longer matches.
"""
import hashlib, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INV = os.path.join(ROOT, 'investor')
MAN = os.path.join(INV, 'publication-manifest.json')

def pages(data):
    return len(re.findall(rb'/Type\s*/Page[^s]', data))

def main():
    man = json.load(open(MAN, encoding='utf-8'))
    files = []
    for d, dirs, names in os.walk(INV):
        dirs[:] = sorted(dirs)
        for n in sorted(names):
            p = os.path.join(d, n)
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            if rel == 'investor/publication-manifest.json' or n == '.DS_Store':
                continue
            data = open(p, 'rb').read()
            row = {'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            if n.endswith('.pdf'):
                row['pages'] = pages(data)
            files.append(row)
    man['files'] = sorted(files, key=lambda r: r['path'])
    with open(MAN, 'w', encoding='utf-8') as f:
        json.dump(man, f, indent=2, ensure_ascii=True)
        f.write('\n')
    print(f"{len(files)} files")

if __name__ == '__main__':
    main()
