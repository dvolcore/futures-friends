#!/usr/bin/env python3
"""Start Monday bundle check (ETEACH E6 / leverage 1): one PDF per day must carry everything the day names.

    python3 tools/check-unit1-bundle.py 1 9            # or: all
    python3 tools/check-unit1-bundle.py all [--src /Volumes/FFCRM/app/hub/content/program]

Reads each printables/unit-1/start-monday/u1-day-NN-start-monday.pdf as text (PyMuPDF), the way a substitute would, and checks it
against the canonical records, not against the generator's own bookkeeping:
  1. it opens, every page says Draft, and the contents page lists sections that cover every page exactly once, each in range;
  2. every "this bundle p.N" reference points at the first page of a listed section, and a named printable points at the section
     with that name;
  3. every printable and puppet the day's records name (media items and supply-catalog printables) is inside: the classroom page,
     story set or Futures at Home page is found in the bundle with the same text it has in its own file; a library book is marked
     "your own shelf or library"; a cookbook page or recipe card is on the kitchen page; anything not produced has a "Use instead"
     line that points inside the bundle;
  4. Friday's earlier picture-talk cards, the day's family card (same activity id as the teacher plan) and the prep list are inside;
  5. every block's goal, age versions, prompts, materials and the four whole-child fields are printed;
  6. no internal or outside path is needed: no file name, folder, site route, web address, QR code or app.
Prints one line per check and exits non-zero on any failure.
"""
import argparse, json, os, re, sys

import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import private_paths as PP   # IP lockdown 2026-10-07: the bundles live in the private platform repo
norm = lambda s: re.sub(r'\s+', ' ', s.replace('“', '"').replace('”', '"').replace('’', "'")).strip()
flat = lambda s: norm(s).replace(' ', '')
STAMP = re.compile(r'Start Monday · Day \d+ · Draft, not reviewed · bundle p\. \d+ of \d+|Bundle p\. \d+|Page \d+')


def page_texts(path):
    with fitz.open(path) as d:
        return [norm(p.get_text()) for p in d], d.get_toc()


def body(t):
    """a page's text without page numbers and the bundle stamp, for comparing a page with the page it came from"""
    return flat(STAMP.sub('', t))


def check_day(n, man, recs, sup, path=None):
    fails, notes = [], []
    path = path or os.path.join(PP.FILES, 'printables', 'unit-1', 'start-monday', f'u1-day-{n:02d}-start-monday.pdf')
    if not os.path.exists(path):
        return [f'bundle missing: {os.path.relpath(path, PP.FILES)}'], notes
    pages, toc = page_texts(path)
    N = len(pages)
    allt = ' '.join(pages)
    has = lambda s: flat(s) in flat(allt)
    notes.append(f'opens: {os.path.relpath(path, PP.FILES)} ({N} pages)')
    # 1. Draft on every page; the contents rows partition pages 2..N
    for i, t in enumerate(pages):
        if 'Draft' not in t and 'DRAFT' not in t:
            fails.append(f'p.{i + 1}: no Draft label')
    rows = [(int(a), int(b or a), norm(t)) for a, b, t in re.findall(r'p\.(\d+)(?: to (\d+))? (.+?)(?= p\.\d+|$)', pages[0].split(f'In this bundle ({N} pages)', 1)[-1].split('Futures Friends · Unit 1 · Start Monday bundle')[0])]
    if f'In this bundle ({N} pages)' not in pages[0]:
        fails.append('the contents page does not state the page count')
    covered = []
    for a, b, t in rows:
        if not 2 <= a <= b <= N:
            fails.append(f'contents row out of range: p.{a} to {b} {t[:50]}')
        covered += range(a, b + 1)
    if sorted(covered) != list(range(2, N + 1)):
        fails.append(f'contents rows do not cover pages 2 to {N} exactly once')
    starts = {a: t for a, _, t in rows}
    if [x[2] for x in toc[1:]] != [a for a, _, _ in rows]:
        fails.append('PDF outline and contents page disagree')
    notes.append(f'contents: {len(rows)} sections cover pages 2 to {N}')
    # 2. every in-bundle page reference lands on a section start; named printables land on the section of that name
    refs = [int(x) for x in re.findall(r'this bundle,? p\.(\d+)', allt)]
    for p in sorted(set(refs)):
        if p not in starts:
            fails.append(f'"this bundle p.{p}" is not the start of a listed section')
    for title, p in re.findall(r'(?:^|• |\. )([A-Z][^•:]{3,140}?) \((?:ready|draft)\): this bundle p\.(\d+)', allt):
        sec = starts.get(int(p), '')
        if flat(title)[:24] not in flat(sec):
            fails.append(f'"{title[:50]}" points at p.{p}, which is "{sec[:50]}"')
    notes.append(f'{len(refs)} in-bundle page references, all on section starts' if not any('start of a listed' in f for f in fails) else 'page references checked')
    # 3. every printable and puppet the records name is inside
    A = man['assets']
    refs_needed = []
    for r in recs:
        for m in r['media']:
            refs_needed.append((r['id'], m['ref'], m['status']))
    for x in sup:
        if x.get('asset'):
            refs_needed.append(('supplies', x['asset'], A[x['asset']]['status']))
    seen = set()
    for rid, ref, status in refs_needed:
        if ref in seen:
            continue
        seen.add(ref)
        a = A[ref]
        if status == 'unavailable':
            if not re.search(re.escape(flat(a['title'] + '. Use instead:')) + r'.{0,120}?(thisbundle,?p\.\d+|inthispacket)', flat(allt)):
                fails.append(f'{rid}: "{a["title"]}" is not produced and has no "Use instead" inside the bundle')
            continue
        if ref.startswith('print:lib-'):
            if not has(f'{a["title"]} (ready): your own shelf or library'):
                fails.append(f'{rid}: library book "{a["title"]}" not marked as your own shelf or library')
            continue
        if ref.startswith('print:cookbook-') or ref.startswith('print:recipe-'):
            want = {'print:cookbook-simple-sides': 'Simple Sides and Staples: today\'s foods', 'print:cookbook-rainbow-tasting': 'The 5-minute rainbow tasting'}.get(ref) \
                or f'Recipe card {ref.split("-", 1)[1]}:'
            if not has(want) or not has('For the cook'):
                fails.append(f'{rid}: {ref} is not on the kitchen page ({want})')
            continue
        if ref == f'print:u1-d{n:02d}-packet' or ref.endswith('-picture-talk'):
            continue                                   # this packet and its picture-talk page are the packet itself (checked in 5)
        if ref == 'print:u1-family-cards':
            continue                                   # checked in 4
        rel = a['location'].split(': ', 1)[-1]
        # curriculum files are private (IP lockdown); Futures at Home printables are still on the public site
        src = os.path.join(PP.FILES if rel.startswith('printables/unit-') else ROOT, rel) if a['location'].startswith('futures-friends site') else None
        if ref.startswith(('print:u1-readaloud-', 'print:u1-cue-')):
            slug = re.sub(r'^print:u1-(readaloud|cue)-', '', ref)
            src = os.path.join(PP.FILES, 'printables', 'unit-1', f'u1-story-{slug}.pdf')
        if not src or not os.path.exists(src):
            fails.append(f'{rid}: {ref} has no source file to compare')
            continue
        with fitz.open(src) as d:
            if src.endswith('u1-classroom-printables.pdf'):
                first = norm(d[0].get_text())
                m = re.search(r'p\.\s*(\d+)\s+' + re.escape(norm(a['title'])), first)
                if not m:
                    fails.append(f'{rid}: {ref} not in the classroom printables contents')
                    continue
                want = [body(norm(d[int(m.group(1)) - 1].get_text()))]
            else:
                want = [body(norm(p.get_text())) for p in d]
        got = [body(t) for t in pages]
        missing = [i for i, w in enumerate(want) if w not in got]
        if missing:
            fails.append(f'{rid}: {ref} ({os.path.basename(src)}) page(s) {[i + 1 for i in missing]} not in the bundle')
    notes.append(f'{len(seen)} catalogued items the day names: each one inside, from your shelf, on the kitchen page, or replaced inside')
    # 4. earlier picture-talk cards, the family card, the prep list
    for r in recs:
        for m in r['materials']:
            for g in re.findall(r'Picture-talk cards? from Days? ([0-9, and]+)', m):
                for k in re.findall(r'\d+', g):
                    ep = man['picture_talk'][f'{int(k):02d}']['episode']
                    if not any(f'Picture-talk story: "{norm(ep)}"' in t and f'Day {int(k)}.' in t for t in pages):
                        fails.append(f'{r["id"]}: the Day {k} picture-talk card is not in the bundle')
    good = next(r for r in recs if r['block'] == 'goodbye')
    if not any(f'Today at Futures: Day {n}, ' in t and f'activity {good["id"]}' in t and good['home_continuation']['title'] in t
               and all(flat(x) in flat(t) for x in good['home_continuation']['steps']) for t in pages):
        fails.append(f'the family card for {good["id"]} is not in the bundle')
    if 'Prep list' not in pages[1] or not has('Supplies for today: one list, no repeats'):
        fails.append('the prep list is not at the front')
    # 5. the packet: every block's words and the four whole-child fields
    for r in recs:
        for what, s in [('goal', r['objective'])] + [('prompt', p) for p in r['prompts']] + [('material', m) for m in r['materials']] \
                + [('participation choice', p) for p in r['participation_alternatives']] + [('movement alternative', r['movement_alternative'])] \
                + ([('meal reference', r['meal_reference'])] if r['meal_reference'] else []) + [('family connection', r['family_connection']['note'])]:
            if not has(s):
                fails.append(f'{r["id"]}: {what} not found: {s[:60]}')
        if r['block'] != 'zones':
            for k, v in r['age_adaptations'].items():
                if not has(v):
                    fails.append(f'{r["id"]}: {k} version not found')
    if has('No food in this block.') is False and any(r['meal_reference'] is None for r in recs):
        fails.append('a block without food does not say so')
    # 6. nothing outside the bundle is needed
    scan = allt.replace('Unit 1 classroom printables · Draft', '').replace('No screen, app or internet needed', '').replace('nothing needs a screen, an app, the internet or another file', '') \
               .replace('No screen, app, internet or other file is needed', '')
    for pat in [r'\.pdf\b', r'printables/', r'classroom printables', r'u1-story-', r'https?://', r'www\.', r'#[a-z][a-z-]+', r'\bdocs/', r'\bQR\b', r'\bapp\b']:
        hit = re.search(pat, scan, re.I)
        if hit:
            fails.append(f'needs something outside the bundle: "{scan[max(0, hit.start() - 40):hit.end() + 20]}"')
    return fails, notes


def selftest(man, cat, src):
    """the check must fail on broken bundles: a missing printable page, a missing family card, an outside path, a page with no Draft label"""
    import tempfile
    n = 9
    recs = json.load(open(os.path.join(src, man['record_files'][n - 1])))
    lines = [m.lower() for r in recs for m in r['materials']]
    sup = [e for e in cat if e.get('asset') and any(re.search(p, l) for p in e['match'] for l in lines)]
    good = os.path.join(PP.FILES, 'printables', 'unit-1', 'start-monday', f'u1-day-{n:02d}-start-monday.pdf')
    assert not check_day(n, man, recs, sup, good)[0], 'the real Day 9 bundle should pass'
    def broken(edit):
        d = fitz.open(good); edit(d)
        f = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False); f.close(); d.save(f.name); d.close()
        out = check_day(n, man, recs, sup, f.name)[0]; os.remove(f.name)
        return ' | '.join(out)
    def find(d, s):
        return next(i for i, p in enumerate(d) if s in p.get_text())
    def blank(d, i):                                   # empty a page but keep the page count, so only the content check can catch it
        d[i].add_redact_annot(d[i].rect); d[i].apply_redactions()
    cases = [
        ('empty the Feeling Faces page', lambda d: blank(d, find(d, 'Cut apart. Happy, sad, mad')), r'print:u1-feeling-faces .*not in the bundle'),
        ('empty the family card page', lambda d: blank(d, find(d, 'Today at Futures: Day 9')), r'family card for u1-w2-d4-goodbye'),
        ('empty the story set cue card', lambda d: blank(d, find(d, 'Teacher cue card')), r'u1-story-big-feelings-brighter-days\.pdf\) page'),
        ('add an outside path', lambda d: d[2].insert_text((72, 300), 'see printables/unit-1/u1-classroom-printables.pdf'), r'outside the bundle'),
        ('cover a Draft label', lambda d: [d[-1].add_redact_annot(r) for r in d[-1].search_for('Draft')] and d[-1].apply_redactions(), r'no Draft label'),
    ]
    for name, edit, want in cases:
        got = broken(edit)
        assert re.search(want, got), f'self-test "{name}": the check did not fail as expected ({got[:200]})'
        print(f'self-test ok: {name} -> FAIL ({got[:90]}...)')
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('days', nargs='+', help='day numbers, "all", or "selftest"')
    ap.add_argument('--src', default='/Volumes/FFCRM/app/hub/content/program')
    a = ap.parse_args()
    man = json.load(open(os.path.join(a.src, 'unit-1-release.json')))
    cat = json.load(open(os.path.join(a.src, 'unit-1-supplies.json')))['items']
    if a.days == ['selftest']:
        return selftest(man, cat, a.src)
    days = range(1, 21) if a.days == ['all'] else [int(x) for x in a.days]
    bad = 0
    for n in days:
        recs = json.load(open(os.path.join(a.src, man['record_files'][n - 1])))
        lines = [m.lower() for r in recs for m in r['materials']]
        sup = [e for e in cat if e.get('asset') and any(re.search(p, l) for p in e['match'] for l in lines)]
        fails, notes = check_day(n, man, recs, sup)
        print(f'Day {n}: {man["days"][n - 1]["title"]}: {"PASS" if not fails else "FAIL"}')
        for x in notes:
            print('   ok  ', x)
        for x in fails:
            print('   FAIL', x)
        bad += len(fails)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
