#!/usr/bin/env python3
"""Cut the one public sample (Unit 1 Day 9 teacher packet) from the PRIVATE packet and watermark it.
usage: cut_sample.py <private packet pdf> <output pdf>"""
import sys, fitz
src, out = sys.argv[1], sys.argv[2]
d = fitz.open(src)
LINE = 'Sample - licensed centers receive the full program. Futures Friends Unit 1, Day 9 (draft). Not for redistribution.'
INK = (0.549019, 0.10196, 0.10196)
for p in d:
    w, h = p.rect.width, p.rect.height
    for y0, base in ((2, 13.6), (774, 785.6)):     # top band, bottom band (y down)
        p.draw_rect(fitz.Rect(0, y0, w, y0 + 16), color=None, fill=(1, 0.97, 0.88), fill_opacity=0.95)
        p.insert_text(fitz.Point(36, base), LINE, fontname='helv', fontsize=8.5, color=INK)
    pt = fitz.Point(62.938, 337.604)
    p.insert_text(pt, 'SAMPLE', fontname='helv', fontsize=120, color=(0.8, 0.15, 0.15), fill_opacity=0.22, morph=(pt, fitz.Matrix(-35)))
md = dict(d.metadata); md['title'] = 'Futures Friends sample: Unit 1 Day 9 teacher packet'; md['subject'] = 'Sample - licensed centers receive the full program'
d.set_metadata(md)
d.save(out, garbage=4, deflate=True)
