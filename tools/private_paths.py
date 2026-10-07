"""Where the licensed curriculum is written (IP lockdown, owner decision 2026-10-07: "I don't want to give away our full curriculum
to our competitors"). The packet generators and their checks read and write the PRIVATE platform repo, never this public site:

    FF_CURRICULUM_PRIVATE (default /Volumes/FFCRM/app/hub/content/curriculum-assets)
        files/printables/unit-<n>/...   teacher packets, Start Monday files, story sets, classroom printables, family cards, previews
        data/unit<n>-data.js, unit1-prep.js, unit1-family.js   the staff data files the Teacher Portal needs once the Hub serves them

Paths stored inside the data files stay "printables/unit-<n>/..." and are relative to files/. tests/ip-lockdown.test.js fails if any of
it appears in the site again. The one public sample (printables/sample/) is cut from a private packet by hand, watermarked.
"""
import os

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIVATE = os.path.abspath(os.environ.get('FF_CURRICULUM_PRIVATE', '/Volumes/FFCRM/app/hub/content/curriculum-assets'))
FILES = os.path.join(PRIVATE, 'files')
DATA = os.path.join(PRIVATE, 'data')


def check():
    """Refuse to run when the private location is missing or inside the public site."""
    real_site, real_priv = os.path.realpath(SITE), os.path.realpath(PRIVATE)
    if real_priv == real_site or real_priv.startswith(real_site + os.sep):
        raise SystemExit(f'FF_CURRICULUM_PRIVATE ({PRIVATE}) is inside the public site: refusing to write curriculum there.')
    if not os.path.isdir(PRIVATE):
        raise SystemExit(f'The private curriculum location is not mounted: {PRIVATE} (set FF_CURRICULUM_PRIVATE).')
    os.makedirs(FILES, exist_ok=True); os.makedirs(DATA, exist_ok=True)
