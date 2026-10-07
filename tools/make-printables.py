#!/usr/bin/env python3
"""Builds the Futures at Home printables (US Letter PDFs) and their preview images.

    python3 tools/make-printables.py

Reads the content from family-library-data.js and whole-child.js (through node), so the PDFs say exactly what the site says.
Uses only the site's own art (img/cut_*.webp, img/rainbow/*.svg, img/brand/ff-plush-wordmark-640.png, img/plush/) and the self-hosted brand fonts
(fonts/*.woff2, converted to TTF in a temp folder at build time; nothing is downloaded).
Writes printables/*.pdf, printables/es/*.pdf (Spanish drafts, marked as awaiting review), the combined starter pack and
printables/previews/*.png. Needs: reportlab, fonttools (with brotli), Pillow, PyMuPDF.
"""
import io, json, os, subprocess, sys, tempfile

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image
import fitz  # PyMuPDF
from reportlab import rl_config
from reportlab.lib.colors import HexColor, white
rl_config.useA85 = 0   # binary streams: no ASCII85 overhead
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import ff_brand as B   # the curriculum identity: tokens, felt, stitch, cast roles, icons (wave 10)
OUT = os.path.join(ROOT, 'printables')
TMP = tempfile.mkdtemp(prefix='ff-printables-')

NAVY, GOLD, INK, MUTED, CREAM = HexColor('#0A2B38'), HexColor('#E7A928'), HexColor('#14313D'), HexColor('#5B6E77'), HexColor('#FBF6EC')
C = {k: HexColor(B.FRIEND[k]['deep']) for k in ('booker', 'lumi', 'zuri', 'bop', 'gold')}      # ink colours (4.5:1 on paper and tint)
TINT = {k: HexColor(B.FRIEND[k]['tint']) for k in ('booker', 'lumi', 'zuri', 'bop', 'gold')}
NAME = {'booker': 'Booker', 'lumi': 'Lumi', 'zuri': 'Zuri', 'bop': 'Bop'}


# ---------------------------------------------------------------- fonts and art
def fonts():
    def ttf(src, dst, wght=None):
        f = TTFont(os.path.join(ROOT, 'fonts', src))
        if wght and 'fvar' in f:
            f = instancer.instantiateVariableFont(f, {'wght': wght})
        f.flavor = None
        p = os.path.join(TMP, dst)
        f.save(p)
        return p
    pdfmetrics.registerFont(RLFont('Fredoka', ttf('fredoka-latin.woff2', 'Fredoka-600.ttf', 600)))
    pdfmetrics.registerFont(RLFont('Poppins', ttf('poppins-400-latin.woff2', 'Poppins-400.ttf')))
    pdfmetrics.registerFont(RLFont('Poppins-SemiBold', ttf('poppins-600-latin.woff2', 'Poppins-600.ttf')))
    pdfmetrics.registerFontFamily('Poppins', normal='Poppins', bold='Poppins-SemiBold', italic='Poppins', boldItalic='Poppins-SemiBold')
    pdfmetrics.registerFont(RLFont('Fredoka-Bold', ttf('fredoka-latin.woff2', 'Fredoka-700.ttf', 700)))   # the curriculum's display weight
    FONT_FILES.update({'Poppins': os.path.join(TMP, 'Poppins-400.ttf'), 'Poppins-SemiBold': os.path.join(TMP, 'Poppins-600.ttf'), 'Fredoka': os.path.join(TMP, 'Fredoka-600.ttf')})


FONT_FILES = {}   # TTF paths for PyMuPDF text added after a build (contents pages, bundle stamps): the same brand fonts, never Helvetica


ART = {}
def art(key, h=None):
    """a plush cut-out from the library (img/plush/characters): a friend key ('booker') or any pose/cast slug ('lumi-calm-breath',
    'ms-june'); the brand module picks the 480 or 960 px file for the printed size"""
    return B.char(key, h)


def food(name):
    k = 'food-' + name
    if k not in ART:
        with open(os.path.join(ROOT, 'img', 'rainbow', name + '.svg'), 'rb') as f:
            doc = fitz.open('svg', f.read())
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
        ART[k] = (ImageReader(io.BytesIO(pix.tobytes('png'))), (pix.width, pix.height))
    return ART[k]


def logo(kind='plush'):
    """the stitched felt program logo on story-world surfaces (bands, covers, certificates); 'sticker' for plain-paper headers"""
    return B.logo(kind)


def figure(c, key, cx, y, h):
    """a character standing on its felt-grass strip (DESIGN.md: characters stand on felt grass)"""
    ref = art(key, h)
    w = h * ref[1][0] / ref[1][1]
    B.ground(c, cx - w / 2 - 6, y - 3, w + 12, 7)
    draw_img(c, ref, None, y, h=h, cx=cx)
    return w


def draw_img(c, ref, x, y, h=None, w=None, cx=None):
    """aspect is always kept; cx centres the image on that x instead of starting at x"""
    reader, (iw, ih) = ref
    if h is not None:
        w = h * iw / ih
    else:
        h = w * ih / iw
    if cx is not None:
        x = cx - w / 2
    c.drawImage(reader, x, y, width=w, height=h, mask='auto')
    return w, h


# ---------------------------------------------------------------- content from the site
def site_data():
    js = """
    const fs=require('fs'),vm=require('vm');const window={FFhooks:[],FF_INTAKE:{url:''}};
    const ctx=vm.createContext({console,window,setTimeout:()=>0,clearTimeout(){},innerHeight:800,document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null}});
    for(const f of ['data.js','supporting-cast.js','views.js','whole-child.js','family-library-data.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
    process.stdout.write(JSON.stringify({fam:window.FFFamily, bop:window.FFWholeChild.ACTS}));
    """
    out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


# ---------------------------------------------------------------- drawing helpers
def style(size, font='Poppins', color=INK, lead=None, align=0):
    return ParagraphStyle('s', fontName=font, fontSize=size, leading=lead or size * 1.3, textColor=color, alignment=align)


def para(c, text, x, y_top, w, st):
    p = Paragraph(text, st)
    _, h = p.wrap(w, 1000)
    p.drawOn(c, x, y_top - h)
    return h


def stitch(c, x, y, w, h, color, r=14, fill=None, lw=1.6):
    """a stitched panel: light felt in the tint when filled, then the thread line in the friend's colour"""
    if fill is not None:
        B.felt(c, x, y, w, h, '#' + fill.hexval()[2:], r=r, stitch=False, grain=4.5)
    B.stitch_rect(c, x + 4.5, y + 4.5, w - 9, h - 9, max(2, r - 4), '#' + color.hexval()[2:], lw * 0.8, alpha=1)


def cutline(c, x, y, w, h):
    c.setStrokeColor(HexColor('#A7B2B6')); c.setLineWidth(.6); c.setDash(2, 3)
    c.rect(x, y, w, h, stroke=1, fill=0)
    c.setDash()
    B.draw_icon(c, 'cut', x + 6, y + h - 5.5, 11, HexColor('#8C999E'), lw=2)


def header(c, W, H, title, sub, color, es=False, friend='navy'):
    """story-world band (felt in the friend's colour, plush logo, white title) over a plain-paper page"""
    band = 1.18 * inch
    B.felt(c, -6, H - band, W + 12, band + 6, B.FRIEND[friend]['felt'], stitch=False)
    B.stitch_line(c, 0, H - band + 8, W, H - band + 8, B.FRIEND[friend]['thread'], 1.1)
    draw_img(c, logo(), 0.45 * inch, H - 0.98 * inch, h=0.78 * inch)
    tx = 0.45 * inch + 0.78 * inch * logo()[1][0] / logo()[1][1] + 14
    c.setFillColor(white); c.setFont('Fredoka', B.fit_size(title, 'Fredoka', 26, W - tx - 0.5 * inch, 14)); c.drawString(tx, H - 0.56 * inch, title)
    c.setFillColor(B.H('#FFFFFF')); c.setFont('Poppins', B.fit_size(sub, 'Poppins', 10.2, W - tx - 0.45 * inch, 7)); c.drawString(tx, H - 0.84 * inch, sub)
    if es:
        B.pill(c, 'BORRADOR: traducción pendiente de revisión', W - 0.45 * inch, H - band - 0.34 * inch, 8.2, B.NAVY, B.GOLD, align='right')


def footer(c, W, es=False):
    t = ('Futures en Casa · gratis de Futures Friends · © 2026 Futures Friends. Se puede imprimir y copiar para uso familiar y escolar.'
         if es else
         'Futures at Home · free from Futures Friends for every family · © 2026 Futures Friends. Free to print and copy for home and classroom use.')
    B.stitch_line(c, 0.5 * inch, 0.6 * inch, W - 0.5 * inch, 0.6 * inch, '#CDBFA4', .7, (2.4, 2.2))
    c.setFillColor(MUTED); c.setFont('Poppins', 8)
    c.drawCentredString(W / 2, 0.38 * inch, t)


def new_canvas(name, size=letter, es=False, title=''):
    path = os.path.join(OUT, 'es' if es else '', name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    c = canvas.Canvas(path, pagesize=size, invariant=1)
    c.setTitle(title); c.setAuthor('Futures Friends'); c.setSubject('Futures at Home printable'); c.setCreator('tools/make-printables.py')
    return c, path


# ---------------------------------------------------------------- 1. Our Day picture schedule
DAY = {
    'en': [('bop', 'Wake up', 'Good morning! Stretch up tall and wiggle.'),
           ('booker', 'Story time', 'Read together. Ask one question.'),
           ('zuri', 'Eat together', 'Meal or snack, and water. Name the colors.'),
           ('bop', 'Move and go outside', 'Ready? Bop & Go! Run, dance, explore.'),
           ('lumi', 'Quiet time', 'Rest your body. Smell the flower, blow the candle.'),
           ('zuri', 'Play and wonder', 'I wonder... what happens if we try?'),
           ('booker', 'Bath and brush', 'Front, back, top, sparkle!'),
           ('lumi', 'Bedtime', 'One good thing from today. Good night.')],
    'es': [('bop', 'Despertar', '¡Buenos días! Estírate y muévete.'),
           ('booker', 'Hora del cuento', 'Lean juntos. Haz una pregunta.'),
           ('zuri', 'Comer juntos', 'Comida o merienda, y agua. Nombren los colores.'),
           ('bop', 'Moverse y salir', '¿Listos? ¡Bop y a jugar! Corre, baila, explora.'),
           ('lumi', 'Tiempo tranquilo', 'Descansa. Huele la flor, sopla la vela.'),
           ('zuri', 'Jugar y preguntarse', 'Me pregunto... ¿qué pasa si probamos?'),
           ('booker', 'Baño y cepillado', '¡Adelante, atrás, arriba, brillo!'),
           ('lumi', 'Hora de dormir', 'Una cosa buena de hoy. Buenas noches.')]}


DAY_POSE = ['bop-waving', 'booker-reading', 'zuri-apple', 'bop-running', 'lumi-calm-breath', 'zuri-magnifier', 'booker-waving', 'lumi-heart-hands']


def daily_rhythm(lang='en'):
    es = lang == 'es'
    c, path = new_canvas('futures-en-casa-nuestro-dia.pdf' if es else 'futures-at-home-daily-rhythm.pdf', es=es, title='Nuestro día' if es else 'Our Day: picture schedule')
    W, H = letter
    header(c, W, H, 'Nuestro día' if es else 'Our Day',
           'Un horario con dibujos para el refrigerador. Recorta las tarjetas y ordénalas a tu manera.' if es else
           'A picture schedule for the fridge. Cut the cards apart to change the order.', NAVY, es)
    cw, ch, gx, gy = 3.7 * inch, 2.05 * inch, 0.35 * inch, 0.22 * inch
    x0, ytop = (W - 2 * cw - gx) / 2, H - 1.4 * inch
    for i, (k, t, s) in enumerate(DAY[lang]):
        col, row = i % 2, i // 2
        x, y = x0 + col * (cw + gx), ytop - (row + 1) * ch - row * gy
        stitch(c, x, y, cw, ch, C[k], fill=TINT[k])
        c.setFillColor(C[k]); c.circle(x + 0.38 * inch, y + ch - 0.38 * inch, 0.2 * inch, stroke=0, fill=1)
        c.setFillColor(white); c.setFont('Fredoka', 13); c.drawCentredString(x + 0.38 * inch, y + ch - 0.43 * inch, str(i + 1))
        figure(c, DAY_POSE[i], x + cw - 0.62 * inch, y + 0.2 * inch, 1.22 * inch)
        c.setFillColor(C[k]); c.setFont('Fredoka', 20); c.drawString(x + 0.7 * inch, y + ch - 0.48 * inch, t)
        para(c, s, x + 0.3 * inch, y + ch - 0.75 * inch, cw - 1.75 * inch, style(12.5, lead=16))
    footer(c, W, es)
    c.showPage(); c.save()
    return path


# ---------------------------------------------------------------- 2. Rainbow at Home tracker
RAINBOW = [('Red Rockets', 'Cohetes Rojos', ['strawberry', 'tomato'], '#E23B3B'),
           ('Orange Sunshine', 'Sol Naranja', ['carrot', 'orange'], '#F28C28'),
           ('Yellow Sunbeams', 'Rayos Amarillos', ['banana', 'corn'], '#E8B90F'),
           ('Green Sprouts', 'Brotes Verdes', ['broccoli', 'peas'], '#2E9E57'),
           ('Purple Pals', 'Amigos Morados', ['blueberries', 'grapes'], '#7B57C8'),
           ('Cozy Clouds', 'Nubes Acogedoras', ['cauliflower', 'bread'], '#B89B72')]


def rainbow(lang='en'):
    es = lang == 'es'
    c, path = new_canvas('futures-en-casa-arcoiris.pdf' if es else 'futures-at-home-rainbow-tracker.pdf', size=landscape(letter), es=es,
                         title='Arcoíris en casa' if es else 'Rainbow at Home week tracker')
    W, H = landscape(letter)
    header(c, W, H, 'Arcoíris en casa' if es else 'Rainbow at Home',
           'Colorea un círculo por cada color que tu familia vea en las comidas esta semana.' if es else
           'Color in a circle for each color your family spots at meals this week.', NAVY, es, friend='zuri')
    days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] if es else ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    left, top, labw, colw, rowh = 0.5 * inch, H - 1.55 * inch, 3.15 * inch, (W - 1 * inch - 3.15 * inch) / 7, 0.86 * inch
    c.setFont('Poppins-SemiBold', 11); c.setFillColor(MUTED)
    for j, d in enumerate(days):
        c.drawCentredString(left + labw + colw * (j + .5), top, d)
    for i, (en, sp, foods, hexc) in enumerate(RAINBOW):
        y = top - 0.2 * inch - (i + 1) * rowh
        col = HexColor(hexc)
        c.setFillColor(HexColor('#FFFFFF')); c.setStrokeColor(HexColor('#E6DCCB')); c.setLineWidth(1)
        c.roundRect(left, y + 4, W - 1 * inch, rowh - 8, 10, stroke=1, fill=1)
        c.setFillColor(col); c.roundRect(left, y + 4, 0.16 * inch, rowh - 8, 4, stroke=0, fill=1)
        for n, f in enumerate(foods):
            draw_img(c, food(f), left + 0.28 * inch + n * 0.5 * inch, y + 0.2 * inch, h=0.46 * inch)
        c.setFillColor(INK); c.setFont('Fredoka', 15); c.drawString(left + 1.35 * inch, y + rowh / 2 - 5, sp if es else en)
        for j in range(7):
            c.setStrokeColor(col); c.setLineWidth(2); c.setDash(4, 3)
            c.circle(left + labw + colw * (j + .5), y + rowh / 2, 0.24 * inch, stroke=1, fill=0)
            c.setDash()
    para(c, ('<b>Cuenta colores, no bocados.</b> Tu hijo decide qué comer y cuánto. La comida nunca es un premio ni un castigo. '
             'Corta las frutas redondas (uvas, arándanos) en trozos pequeños y sirve las verduras duras cocidas y blandas para menores de 5 años.') if es else
         ('<b>Count colors, not bites.</b> Your child decides what to eat and how much. Food is never a reward or a punishment. '
          'For children under 5, cut round foods like grapes and blueberries small, and serve hard vegetables cooked soft.'),
         left, 1.05 * inch, W - 1 * inch, style(10.5, lead=14, color=INK))
    footer(c, W, es)
    c.showPage(); c.save()
    return path


# ---------------------------------------------------------------- 3. Lumi's calm-down cards, 4. Bop's move cards (4 cards a page)
CALM = {
    'en': [('Smell the flower, blow the candle', ['Hold up a pretend flower. Smell it slowly.', 'Hold up a pretend candle. Blow it out slowly.', 'Do it three times, together.']),
           ('Balloon belly', ['Put a hand on your tummy.', 'Breathe in slowly: fill your balloon belly.', 'Let the air out slowly. Three balloons.']),
           ('Calm statue', ['Freeze in a comfy pose.', 'Soft face, quiet hands.', 'Come back to life one finger at a time.']),
           ('Three quiet sounds', ['Get very still.', 'Listen. What can you hear?', 'Whisper three sounds you noticed.']),
           ('Soft body', ['Soft hands.', 'Soft shoulders.', 'Soft face. Soft tummy. Rest.']),
           ('Hug and squeeze', ['Wrap your arms around yourself.', 'Squeeze gently and count to three.', 'Let go and smile. Ask for a hug if you want one.'])],
    'es': [('Huele la flor, sopla la vela', ['Levanta una flor imaginaria. Huélela despacio.', 'Levanta una vela imaginaria. Sóplala despacio.', 'Háganlo tres veces, juntos.']),
           ('Pancita de globo', ['Pon una mano en tu pancita.', 'Respira despacio: llena tu globo.', 'Saca el aire despacio. Tres globos.']),
           ('Estatua tranquila', ['Quédate quieto en una pose cómoda.', 'Cara suave, manos quietas.', 'Vuelve a moverte dedo por dedo.']),
           ('Tres sonidos tranquilos', ['Quédate muy quieto.', 'Escucha. ¿Qué oyes?', 'Di en voz bajita tres sonidos.']),
           ('Cuerpo suave', ['Manos suaves.', 'Hombros suaves.', 'Cara suave. Pancita suave. Descansa.']),
           ('Abrazo y apretón', ['Abrázate a ti mismo.', 'Aprieta suave y cuenta hasta tres.', 'Suelta y sonríe. Pide un abrazo si quieres.'])]}


CARD_POSE = {'lumi': ['lumi-calm-breath', 'lumi-heart-hands', 'lumi'], 'bop': ['bop-dancing', 'bop-running', 'bop-walk-in', 'bop-waving'],
             'booker': ['booker-reading'], 'zuri': ['zuri-magnifier']}


def cards(name, title, sub, items, es=False, adapt_label='Adapted version'):
    c, path = new_canvas(name, es=es, title=title)
    W, H = letter
    cw, ch = 3.75 * inch, 4.45 * inch
    x0, y0 = (W - 2 * cw) / 2, 0.7 * inch
    for start in range(0, len(items), 4):
        header(c, W, H, title, sub, NAVY, es, friend=items[0][0])
        for n, it in enumerate(items[start:start + 4]):
            k, t, steps, adapt = it
            col, row = n % 2, n // 2
            x, y = x0 + col * cw, y0 + (1 - row) * ch
            cutline(c, x, y, cw, ch)
            stitch(c, x + 8, y + 8, cw - 16, ch - 16, C[k], fill=TINT[k])
            figure(c, CARD_POSE[k][(start + n) % len(CARD_POSE[k])], x + cw - 0.68 * inch, y + ch - 1.5 * inch, 1.24 * inch)
            hh = para(c, t, x + 0.32 * inch, y + ch - 0.36 * inch, cw - 1.6 * inch, style(17, 'Fredoka', C[k], lead=20))
            yy = y + ch - 0.36 * inch - max(hh, 1.25 * inch) - 0.1 * inch
            for i, s in enumerate(steps):
                yy -= para(c, f'<b>{i + 1}.</b> {s}', x + 0.32 * inch, yy, cw - 0.64 * inch, style(11.5, lead=15)) + 5
            if adapt:
                para(c, f'<b>{adapt_label}:</b> {adapt}', x + 0.32 * inch, yy - 4, cw - 0.64 * inch, style(9.5, color=MUTED, lead=12.5))
        footer(c, W, es)
        c.showPage()
    c.save()
    return path


def calm_cards(lang='en'):
    es = lang == 'es'
    say = (['Huele la flor. Sopla la vela.', 'Tu pancita sube y baja.', 'Tu cuerpo está seguro.', 'Escucha. ¿Qué oyes?', 'Suave, suave, suave.', 'Estoy aquí contigo.'] if es else
           ['Smell the flower. Blow the candle.', 'Watch your belly go up and down.', 'Your body is safe.', 'Listen. What can you hear?', 'Soft, soft, soft.', 'I am right here with you.'])
    items = [('lumi', t, s, say[i]) for i, (t, s) in enumerate(CALM[lang])]
    return cards('futures-en-casa-tarjetas-de-calma.pdf' if es else 'futures-at-home-lumi-calm-cards.pdf',
                 'Tarjetas de calma de Lumi' if es else "Lumi's calm-down cards",
                 'Recorta las tarjetas. Ofrécelas, nunca las obligues.' if es else 'Cut the cards apart. Offer them, never force them.',
                 items, es, adapt_label='Lumi dice' if es else 'Lumi says')


def move_cards(bop_acts):
    items = [('bop', a['t'], a['steps'], a['adapt']) for a in bop_acts]
    return cards('futures-at-home-bop-move-cards.pdf', "Bop's move cards",
                 'Ready? Bop & Go! A grown-up joins in. Stop whenever your child is tired.', items)


# ---------------------------------------------------------------- 5. Booker's Book Club reading log
def reading_log(crowd):
    c, path = new_canvas('futures-at-home-booker-reading-log.pdf', title="Booker's Book Club reading log")
    W, H = letter
    header(c, W, H, "Booker's Book Club", 'Write down every book you share. Rereading a favorite counts. Babies count too.', NAVY, friend='booker')
    draw_img(c, art('booker-reading'), None, H - 2.42 * inch, h=1.2 * inch, cx=W - 0.95 * inch)
    para(c, '<b>Try one question each time.</b> ' + ' '.join(f'<b>{v[0]}:</b> {v[1]}' for v in crowd.values()),
         0.5 * inch, H - 1.3 * inch, W - 2.3 * inch, style(9.5, lead=12.5, color=INK))
    top, rowh, left = H - 2.75 * inch, 0.35 * inch, 0.5 * inch
    cols = [(0.45, '#'), (3.9, 'Book title'), (1.3, 'Date'), (1.85, 'Sticker or stamp')]
    x = left
    c.setFont('Poppins-SemiBold', 10); c.setFillColor(MUTED)
    for w, t in cols:
        c.drawString(x + 6, top + 6, t); x += w * inch
    for i in range(20):
        y = top - (i + 1) * rowh
        c.setFillColor(TINT['booker'] if i % 2 == 0 else white); c.rect(left, y, W - 1 * inch, rowh, stroke=0, fill=1)
        c.setFillColor(C['booker']); c.setFont('Fredoka', 12); c.drawCentredString(left + 0.22 * inch, y + 8, str(i + 1))
        if (i + 1) in (10, 20):
            c.setFillColor(GOLD); c.circle(W - 0.85 * inch, y + rowh / 2, 0.13 * inch, stroke=0, fill=1)
    c.setStrokeColor(C['booker']); c.setLineWidth(1); c.setDash(4, 3)
    c.roundRect(left, top - 20 * rowh, W - 1 * inch, 20 * rowh, 6, stroke=1, fill=0); c.setDash()
    para(c, 'Gold dots at 10 and 20: time for a Book Club certificate. Print one free on the Futures at Home page, My Week.',
         left, 0.92 * inch, W - 1 * inch, style(10, color=MUTED))
    footer(c, W)
    c.showPage(); c.save()
    return path


# ---------------------------------------------------------------- 6. Sticker chart
def sticker_chart(friends):
    c, path = new_canvas('futures-at-home-sticker-chart.pdf', size=landscape(letter), title='Our week sticker chart')
    W, H = landscape(letter)
    header(c, W, H, 'Our week', 'A sticker means "we tried it." No scores, no comparing: trying is the win.', NAVY)
    left, top, labw = 0.5 * inch, H - 1.5 * inch, 2.4 * inch
    colw, rowh = (W - 1 * inch - labw) / 7, 1.38 * inch
    c.setFont('Poppins-SemiBold', 11); c.setFillColor(MUTED)
    for j, d in enumerate(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']):
        c.drawCentredString(left + labw + colw * (j + .5), top, d)
    for i, k in enumerate(['booker', 'lumi', 'zuri', 'bop']):
        y = top - 0.15 * inch - (i + 1) * rowh
        stitch(c, left, y + 3, W - 1 * inch, rowh - 6, C[k], r=12, fill=TINT[k], lw=1.2)
        draw_img(c, art(k), left + 0.2 * inch, y + 0.14 * inch, h=rowh - 0.3 * inch)
        c.setFillColor(C[k]); c.setFont('Fredoka', 17); c.drawString(left + 1.15 * inch, y + rowh / 2 + 4, NAME[k])
        c.setFont('Poppins', 9); c.setFillColor(INK); c.drawString(left + 1.15 * inch, y + rowh / 2 - 10, friends[k]['p'] + ' · ' + friends[k]['p2'])
        for j in range(7):
            c.setFillColor(white); c.setStrokeColor(C[k]); c.setLineWidth(1.4); c.setDash(4, 3)
            s = 0.92 * inch
            c.roundRect(left + labw + colw * (j + .5) - s / 2, y + (rowh - s) / 2, s, s, 10, stroke=1, fill=1); c.setDash()
    footer(c, W)
    c.showPage(); c.save()
    return path


# ---------------------------------------------------------------- 7. Story Time talk cards
def story_cards(books):
    c, path = new_canvas('futures-at-home-story-time-cards.pdf', title='Story Time talk cards')
    W, H = letter
    for b in books:
        k = b['c']
        header(c, W, H, 'Story Time talk card', f'{b["title"]} · Book {b["n"]} · read it free on the Futures at Home page, Story Time', NAVY, friend=k)
        draw_img(c, art(B.POSE[k]['opener']), None, H - 3.0 * inch, h=1.8 * inch, cx=W - 1.15 * inch)
        y = H - 1.4 * inch
        y -= para(c, b['title'], 0.6 * inch, y, W - 2.6 * inch, style(26, 'Fredoka', C[k], lead=30)) + 6
        y -= para(c, f'<b>Say-along line:</b> <font color="#{C[k].hexval()[2:]}">{b["refrain"]}</font>', 0.6 * inch, y, W - 2.6 * inch, style(14, lead=18)) + 4
        y -= para(c, b['gesture'], 0.6 * inch, y, W - 2.6 * inch, style(11, color=MUTED)) + 16
        y = min(y, H - 3.2 * inch)
        bx, bw = 0.5 * inch, W - 1 * inch
        # talk about it
        h0 = y
        y -= 0.42 * inch
        c.setFillColor(C[k]); c.setFont('Fredoka', 17); c.drawString(bx + 0.25 * inch, y + 0.1 * inch, 'Talk about it')
        for i, q in enumerate(b['talk']):
            y -= para(c, f'<b>{i + 1}.</b> {q}', bx + 0.25 * inch, y, bw - 0.5 * inch, style(11.5, lead=15)) + 3
        y -= 6
        stitch(c, bx, y, bw, h0 - y, C[k], r=12, lw=1.2)
        y -= 0.18 * inch
        # words
        words = [s['w'] for s in b['spreads'] if s.get('w')][:6]
        h0 = y; y -= 0.42 * inch
        c.setFillColor(C[k]); c.setFont('Fredoka', 17); c.drawString(bx + 0.25 * inch, y + 0.1 * inch, 'Words to talk about')
        half = (bw - 0.5 * inch) / 2
        yl = yr = y
        for i, w in enumerate(words):
            txt = f'<b>{w[0]}:</b> {w[1]}'
            if i % 2 == 0:
                yl -= para(c, txt, bx + 0.25 * inch, yl, half - 10, style(11, lead=14)) + 3
            else:
                yr -= para(c, txt, bx + 0.25 * inch + half, yr, half - 10, style(11, lead=14)) + 3
        y = min(yl, yr) - 6
        stitch(c, bx, y, bw, h0 - y, C[k], r=12, lw=1.2)
        y -= 0.18 * inch
        # try it + take home
        h0 = y; y -= 0.42 * inch
        a = b['act']
        c.setFillColor(C[k]); c.setFont('Fredoka', 17); c.drawString(bx + 0.25 * inch, y + 0.1 * inch, f'Try it together: {a["t"]} ({a["min"]} minutes)')
        y -= para(c, '<b>You need:</b> ' + '; '.join(a['mat']), bx + 0.25 * inch, y, bw - 0.5 * inch, style(10, lead=13)) + 3
        for i, s in enumerate(a['steps']):
            y -= para(c, f'<b>{i + 1}.</b> {s}', bx + 0.25 * inch, y, bw - 0.5 * inch, style(10, lead=13)) + 2
        y -= para(c, f'<b>Take it home:</b> {b["home"]}', bx + 0.25 * inch, y - 4, bw - 0.5 * inch, style(10.5, lead=13.5, color=C[k])) + 10
        stitch(c, bx, y, bw, h0 - y, C[k], r=12, fill=None, lw=1.2)
        assert y > 0.55 * inch, f'{b["title"]}: talk card runs into the footer ({y / inch:.2f} in)'
        footer(c, W)
        c.showPage()
    c.save()
    return path


# ---------------------------------------------------------------- 8. Certificates
CERTS = [('booker', 'Brave Reader', 'for trying new words with a big breath and a brave heart'),
         ('lumi', 'Kindness Keeper', 'for noticing feelings and lending a hand'),
         ('zuri', 'Wonder Scientist', 'for asking questions and trying to find out'),
         ('bop', 'Super Mover', 'for moving your body and trying again')]


def certificates():
    c, path = new_canvas('futures-at-home-certificates.pdf', size=landscape(letter), title='Certificates from the four friends')
    W, H = landscape(letter)
    for k, t, why in CERTS:
        B.felt(c, 0, 0, W, H, B.FRIEND[k]['felt'], stitch=False)
        c.setFillColor(HexColor('#FFFDF7')); c.roundRect(0.45 * inch, 0.45 * inch, W - 0.9 * inch, H - 0.9 * inch, 18, stroke=0, fill=1)
        B.stitch_rect(c, 0.3 * inch, 0.3 * inch, W - 0.6 * inch, H - 0.6 * inch, 22, B.FRIEND[k]['thread'], 1.6)
        B.stitch_rect(c, 0.6 * inch, 0.6 * inch, W - 1.2 * inch, H - 1.2 * inch, 14, B.FRIEND[k]['felt'], 1.4)
        draw_img(c, logo(), None, H - 1.75 * inch, h=1.0 * inch, cx=W / 2)
        c.setFillColor(C['gold']); c.setFont('Poppins-SemiBold', 12); c.drawCentredString(W / 2, H - 2.1 * inch, 'C E R T I F I C A T E')
        c.setFillColor(C[k]); c.setFont('Fredoka', 46); c.drawCentredString(W / 2, H - 2.85 * inch, t)
        c.setFillColor(INK); c.setFont('Poppins', 14); c.drawCentredString(W / 2, H - 3.35 * inch, 'This certificate goes to')
        c.setStrokeColor(INK); c.setLineWidth(1.4); c.line(2.2 * inch, H - 4.3 * inch, W - 2.2 * inch, H - 4.3 * inch)
        c.setFont('Poppins', 14); c.drawCentredString(W / 2, H - 4.75 * inch, why + '.')
        c.setFillColor(MUTED); c.setFont('Poppins', 11)
        c.drawCentredString(W / 2, 1.05 * inch, f'With love from {NAME[k]} and the Futures Friends        Date: ____________________')
        pose = {'booker': 'booker-hero', 'lumi': 'lumi-heart-hands', 'zuri': 'zuri-magnifier', 'bop': 'bop-dancing'}[k]
        reader, (iw, ih) = art(pose)   # wider friends (Bop) keep clear of the dashed border
        B.ground(c, W - 0.82 * inch - 2.1 * inch * iw / ih - 0.2 * inch, 0.72 * inch, 2.1 * inch * iw / ih + 0.1 * inch, 8)
        draw_img(c, art(pose), min(W - 2.35 * inch, W - 0.82 * inch - 2.1 * inch * iw / ih), 0.75 * inch, h=2.1 * inch)
        c.showPage()
    c.save()
    return path


# ---------------------------------------------------------------- pack and previews
def pack(paths):
    out = fitz.open()
    for p in paths:
        with fitz.open(p) as d:
            out.insert_pdf(d)
    out.set_metadata({'title': 'Futures at Home starter pack', 'author': 'Futures Friends', 'creator': 'tools/make-printables.py'})
    dst = os.path.join(OUT, 'futures-at-home-starter-pack.pdf')
    out.save(dst, garbage=3, deflate=True, no_new_id=True)
    return dst


def preview(path, pid):
    os.makedirs(os.path.join(OUT, 'previews'), exist_ok=True)
    with fitz.open(path) as d:
        p = d[0]
        z = 600 / p.rect.width
        pix = p.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        im.thumbnail((600, 600))
        dst = os.path.join(OUT, 'previews', pid + '.png')
        im.save(dst, optimize=True)
    return dst


def main():
    fonts()
    data = site_data()
    fam = data['fam']
    # the talk cards cover Books 1 to 3 (family-library-data.js PRINTABLES 'story-cards': 3 pages); Books 4 and 5 went full later and
    # Book 5 is an ensemble book (c 'all') with no single friend colour or pose, so it needs its own card design before it joins
    full = [b for b in fam['BOOKS'] if b['status'] == 'full' and b['n'] <= 3]
    made = {
        'daily-rhythm': daily_rhythm(),
        'rainbow-tracker': rainbow(),
        'calm-cards': calm_cards(),
        'move-cards': move_cards(data['bop']),
        'reading-log': reading_log(fam['CROWD']),
        'sticker-chart': sticker_chart(fam['FRIENDS']),
        'story-cards': story_cards(full),
        'certificates': certificates(),
    }
    es = [daily_rhythm('es'), rainbow('es'), calm_cards('es')]
    for p in list(made.values()):
        B.finish(p)
    for p in es:
        B.finish(p, 'es-US')
    order = [p['id'] for p in fam['PRINTABLES']]
    assert sorted(order) == sorted(made), (order, list(made))
    pk = pack([made[i] for i in order])
    for pid, path in made.items():
        preview(path, pid)
    for p in list(made.values()) + es + [pk]:
        with fitz.open(p) as d:
            print(f'{os.path.relpath(p, ROOT)}: {d.page_count} page(s)')


if __name__ == '__main__':
    sys.exit(main())
