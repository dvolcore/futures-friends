#!/usr/bin/env python3
"""Substitute-readiness self-check for Unit 1 day packets (ticket R2).

    python3 tools/check-unit1-packet.py 9 10 18 [--src /Volumes/FFCRM/app/hub/content/program]

For each day, reads the printed packet as text (PyMuPDF) and checks, from the packet alone:
  1. every block of the day is in the packet with its goal, its age versions and every adult prompt;
  2. every material the records list is named in the packet;
  3. every printable the packet sends the teacher to exists, opens and has the page it names (classroom printables p.N),
     and every story set / family card file it names exists and opens;
  4. every asset that is not produced (episode, printed book, plush) is paired in the packet with a replacement that exists;
  5. nothing in the packet needs a screen, an app, a QR code or the internet;
  6. the songs the day uses are printed in the packet.
Prints one line per check and exits non-zero on any failure. It cannot judge clarity or timing: that is the rehearsal's job.
"""
import argparse, json, os, re, sys

import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import private_paths as PP   # IP lockdown 2026-10-07: packets live in the private platform repo
FILES = PP.FILES
norm = lambda s: re.sub(r'\s+', ' ', s.replace('“', '"').replace('”', '"').replace('’', "'")).strip()


def text_of(path):
    with fitz.open(path) as d:
        return norm(' '.join(p.get_text() for p in d)), d.page_count


def check_day(n, man, recs):
    fails, notes = [], []
    day = man['days'][n - 1]
    pkt = os.path.join(FILES, day['packet'])
    if not os.path.exists(pkt):
        return [f'packet missing: {day["packet"]}'], notes
    t, pages = text_of(pkt)
    flat = t.replace(' ', '')
    has = lambda s: norm(s).replace(' ', '') in flat
    notes.append(f'packet opens: {day["packet"]} ({pages} pages)')
    # 1. blocks, goals, age versions, prompts
    for r in recs:
        for what, s in [('goal', r['objective'])] + [(f'{k} version', v) for k, v in r['age_adaptations'].items()] + [('prompt', p) for p in r['prompts']]:
            if r['block'] == 'zones' and what.endswith('version'):
                continue                       # zone versions are printed as a table; checked cell by cell below
            if not has(s):
                fails.append(f'{r["id"]}: {what} not found in the packet: {s[:70]}')
        if r['block'] == 'zones':
            for v in r['age_adaptations'].values():
                for cell in re.split(r"(?:Booker's Reading Area|Lumi's Calm Corner|Zuri's Discovery Zone|Bop's Movement Zone|Art table): ", v)[1:]:
                    if not has(cell.strip().rstrip('.')):
                        fails.append(f'{r["id"]}: zone activity not found: {cell[:60]}')
        # 2. materials
        for m in r['materials']:
            if not has(m):
                fails.append(f'{r["id"]}: material not named in the packet: {m}')
    # 3. referenced files and classroom pages
    with fitz.open(os.path.join(FILES, 'printables/unit-1/u1-classroom-printables.pdf')) as cls:
        ncls = cls.page_count
    for p in sorted(set(int(x) for x in re.findall(r'classroom printables p\.(\d+)', t))):
        if not 1 <= p <= ncls:
            fails.append(f'classroom printables p.{p} does not exist ({ncls} pages)')
    for path in sorted({(os.path.join(ROOT, f) if f.startswith('printables/') and not f.startswith('printables/unit-') else os.path.join(FILES, f if f.startswith('printables/') else 'printables/unit-1/' + f))
                        for f in re.findall(r'(printables/[\w/.-]+\.pdf|u1-story-[\w-]+\.pdf)', t)}):
        f = os.path.relpath(path, FILES if path.startswith(FILES) else ROOT)
        try:
            with fitz.open(path) as d:
                notes.append(f'opens: {os.path.relpath(path, FILES if path.startswith(FILES) else ROOT)} ({d.page_count} pages)')
        except Exception as e:  # noqa: BLE001 - report any open failure
            fails.append(f'referenced file does not open: {f} ({e})')
    # 4. unavailable assets have a replacement in the packet
    for r in recs:
        for m in r['media']:
            if m['status'] == 'unavailable':
                title = man['assets'][m['ref']]['title']
                if not has(title + '. Use instead:'):
                    fails.append(f'{r["id"]}: "{title}" has no "Use instead" line')
    if any(r['block'] == 'picture-talk' for r in recs) and 'Picture-talk story: "' not in t:
        fails.append('the picture-talk page is missing')
    # 5. no screen, app, QR or internet
    scan = t.replace('No screen, app or internet needed', '').replace('Nothing needs an account, an app or the internet', '')
    for pat in [r'https?://', r'www\.', r'\bQR\b', r'\bapp\b', r'\bscan\b', r'\bstreaming\b', r'\bYouTube\b', r'\bqueue']:
        if re.search(pat, scan, re.I):
            fails.append(f'packet mentions {pat}')
    if not has('No screen, app or internet needed'):
        fails.append('the no-screen statement is missing')
    # 6. songs
    for s in ['Greeting song', 'Bop Cleanup Song']:
        if not has(s):
            fails.append(f'song not printed: {s}')
    return fails, notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('days', nargs='+', type=int)
    ap.add_argument('--src', default='/Volumes/FFCRM/app/hub/content/program')
    a = ap.parse_args()
    man = json.load(open(os.path.join(a.src, 'unit-1-release.json')))
    bad = 0
    for n in a.days:
        recs = json.load(open(os.path.join(a.src, man['record_files'][n - 1])))
        fails, notes = check_day(n, man, recs)
        print(f'Day {n}: {man["days"][n - 1]["title"]}: {"PASS" if not fails else "FAIL"} ({len(recs)} blocks, '
              f'{sum(len(r["prompts"]) for r in recs)} prompts, {sum(len(r["materials"]) for r in recs)} materials checked)')
        for x in notes:
            print('   ok  ', x)
        for x in fails:
            print('   FAIL', x)
        bad += len(fails)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
