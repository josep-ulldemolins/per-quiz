"""Extrae preguntas, opciones, respuestas y figuras de los PDF del PER (Generalitat de Catalunya)."""
import pymupdf, re, sys, os, json, glob, unicodedata

TOPICS = [  # (desde, hasta, id, nombre)
    (1, 4, "nomenclatura", "Nomenclatura náutica"),
    (5, 6, "amarre", "Amarre y fondeo"),
    (7, 10, "seguridad", "Seguridad"),
    (11, 12, "legislacion", "Legislación"),
    (13, 17, "balizamiento", "Balizamiento"),
    (18, 27, "ripa", "Reglamento (RIPA)"),
    (28, 29, "maniobra", "Maniobra"),
    (30, 32, "emergencias", "Emergencias"),
    (33, 36, "meteorologia", "Meteorología"),
    (37, 41, "navegacion", "Navegación"),
    (42, 45, "carta", "Carta náutica"),
]
def topic_of(n):
    for a, b, t, _ in TOPICS:
        if a <= n <= b: return t

HEADER_Y, FOOTER_Y = 122, 738
MONTHS = {"GEN":1,"FEB":2,"MARÇ":3,"ABRIL":4,"MAIG":5,"JUNY":6,"JUL":7,"AGO":8,"SEP":9,"OCT":10,"NOV":11,"DEC":12}

# ---------- respuestas (última página, casillas rellenas en rojo) ----------
def read_answers(page):
    words = page.get_text("words")
    reds = [dr["rect"] for dr in page.get_drawings()
            if dr.get("fill") and dr["fill"][0] > .8 and dr["fill"][1] < .3 and dr["fill"][2] < .3]
    letters = [w for w in words if len(w[4]) == 1 and w[4] in "abcd"]
    nums = [w for w in words if re.fullmatch(r"\d{1,2}", w[4])]
    res = {}
    for r in reds:
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        L = [w for w in letters if abs((w[0]+w[2])/2 - cx) < 5 and abs((w[1]+w[3])/2 - cy) < 5]
        if not L: continue
        w = L[0]; wy = (w[1] + w[3]) / 2
        cand = [n for n in nums if abs((n[1]+n[3])/2 - wy) < 5 and n[2] <= w[0] + 1 and w[0] - n[2] < 80]
        if not cand: continue
        n = max(cand, key=lambda n: n[2])
        res.setdefault(int(n[4]), set()).add(w[4])
    return res

# ---------- separar catalán / castellano ----------
def split_bilingual(text, is_question):
    text = re.sub(r"\s+", " ", text).strip()
    if is_question:
        m = re.search(r"/\s*¿", text)
        if m: return text[:m.start()].strip(), text[m.start()+1:].strip()
    if is_question and "/" not in text.replace("i/o", "").replace("y/o", "").replace("/a", "").replace("(W/v)", ""):
        sent = [m.end() for m in re.finditer(r"[?:.]\s+(?=[¿A-ZÁÉÍÓÚ“\"])", text)]
        if sent:
            i = min(sent, key=lambda c: abs(c - len(text) / 2))
            return text[:i].strip(), text[i:].strip()
    cands = [m.start() for m in re.finditer(r"/", text)
             if (m.start() > 0 and text[m.start()-1] in " .?:)") or (m.start()+1 < len(text) and text[m.start()+1] == " ")]
    if not cands: return text, text
    mid = len(text) / 2
    i = min(cands, key=lambda c: abs(c - mid))
    ca, es = text[:i].strip(), text[i+1:].strip()
    if not ca or not es: return text, text
    return ca, es

def fix(t):
    t = t.replace("­ ", "").replace("­", "").replace("­", "")
    return unicodedata.normalize("NFC", t)

# ---------- extracción de líneas limpias (sin marca de agua) ----------
def page_bounds(page):
    top, bot = 122, page.rect.y1 - 55
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(sp["text"] for sp in l["spans"])
            if "Escola de Capacitaci" in t: top = l["bbox"][3] + 4
            if "Carrer del Mediterrani" in t: bot = l["bbox"][1] - 2
    return top, bot

def page_lines(page):
    out = []
    HEADER_Y, FOOTER_Y = page_bounds(page)
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        for l in b["lines"]:
            if abs(l["dir"][1]) > 0.01: continue
            y = l["bbox"][1]
            if y < HEADER_Y or y > FOOTER_Y: continue
            t = "".join(s["text"] for s in l["spans"])
            if not t.strip(): continue
            out.append((y, l["bbox"][0], t, l["bbox"]))
    out.sort(key=lambda r: (r[0], r[1]))
    merged = []
    for r in out:  # unir fragmentos en la misma línea visual (p.ej. "a)" + texto)
        if merged and abs(merged[-1][0] - r[0]) < 3 and re.fullmatch(r"\s*[a-d]\s*\)\s*", merged[-1][2]):
            p = merged[-1]
            merged[-1] = (p[0], p[1], p[2].rstrip() + " " + r[2].lstrip(), pymupdf.Rect(p[3]) | pymupdf.Rect(r[3]))
        else: merged.append(r)
    return merged

Q_RE = re.compile(r"^\s*(\d{1,2})\s*(?:[.,]\s*\.?\s*[-–]?|[-–])\s*(?=[^\d\sº’'])(.*)")
O_RE = re.compile(r"^\s*([a-d])\s*\)\s*(.*)")
UT_RE = re.compile(r"^\s*UT\s*\d+")
# Cabecera de tema pegada al final de una opción («… babor.  UT6 Reglament (RIPA) / …»).
UT_TAIL_RE = re.compile(r"[\s\uf0b7\uf020·•]*\bUT\s*\d+\b")

def split_headers(lines):
    """Separa la cabecera de tema del texto que la precede, para que nunca acabe dentro de una opción."""
    for y, x, t, bb in lines:
        t = fix(t)
        m = UT_TAIL_RE.search(t)
        if m and m.start() > 0 and t[:m.start()].strip():
            yield y, x, t[:m.start()], bb
            yield y, x, t[m.start():].lstrip(" \uf0b7\uf020·•"), bb
        else:
            yield y, x, t, bb

def extract(path, outdir_img, exam_id):
    doc = pymupdf.open(path)
    answers = read_answers(doc[-1])
    qs, cur, opt = {}, None, None
    for pno in range(len(doc) - 1):
        page = doc[pno]
        for y, x, t, bb in split_headers(page_lines(page)):
            if UT_RE.match(t): cur = None; continue
            if re.search(r"Espai reservat|Espacio reservado", t): opt = "_done" if cur else None; continue
            if re.fullmatch(r"\s*\d{1,2}\s*", t): continue
            m = Q_RE.match(t)
            qn = int(m.group(1)) if m else None
            if m and 1 <= qn <= 45 and qn not in qs and (cur is None or cur["n"] < qn) and qn <= (max(qs) if qs else 0) + 3:
                n = qn
                cur = {"n": n, "text": m.group(2), "opts": {}, "regions": [[pno, y - 4, None]]}
                qs[n] = cur; opt = None; continue
            if cur is None: continue
            m = O_RE.match(t)
            if m and len(cur["opts"]) < 4 and m.group(1) in cur["opts"] and opt != "_done":
                m = O_RE.match("abcd"[len(cur["opts"])] + ")" + m.group(2))  # errata: letra repetida
            if m and opt != "_done" and m.group(1) not in cur["opts"] and (len(cur["opts"]) == "abcd".index(m.group(1))):
                opt = m.group(1); cur["opts"][opt] = m.group(2); cur["_lastopt_y"] = (pno, bb[3]); continue
            if opt == "_done": continue
            if opt: cur["opts"][opt] += " " + t
            else:
                if "/" not in cur["text"] and (t.lstrip().startswith("¿") or cur["text"].rstrip().endswith("?")): cur["text"] += " /"
                cur["text"] += " " + t
            if cur["regions"][-1][0] != pno: cur["regions"].append([pno, 0, None])
    # límites de región: hasta la siguiente pregunta
    order = sorted(qs)
    return doc, qs, answers

def render_figure(doc, q, nxt, exam_id, outdir_img):
    """Recorta las imágenes/dibujos que caen dentro de la zona de la pregunta (en cualquiera de sus páginas)."""
    for i, (pno, y0, _) in enumerate(q["regions"]):
        r = render_region(doc, q, nxt, pno, y0, f"{exam_id}-{q['n']:02d}.png", outdir_img)
        if r: return r
    return None

def render_region(doc, q, nxt, pno, y0, name, outdir_img):
    page = doc[pno]
    top, bot = page_bounds(page)
    y0 = max(y0, top)
    if nxt and nxt["regions"][0][0] == pno: y1 = nxt["regions"][0][1]
    else: y1 = bot
    zone = pymupdf.Rect(60, y0, page.rect.x1 - 40, y1)
    textlines = [pymupdf.Rect(l[3]) for l in page_lines(page) if len(l[2].strip()) > 14]
    def overlaps_text(r):
        """True si r parece un fondo/cuadro de texto: contiene líneas de pregunta enteras."""
        inside = 0
        for tl in textlines:
            inter = r & tl
            if not inter.is_empty and inter.get_area() > 0.6 * tl.get_area(): inside += 1
        return inside >= 1
    rects = []
    for info in page.get_image_info():
        r = pymupdf.Rect(info["bbox"])
        if r.y0 < top - 2 or r.width < 15 or r.height < 15: continue
        if zone.intersects(r) and (r & zone).get_area() > 0.5 * r.get_area() and not overlaps_text(r): rects.append(r)
    drects = []
    white = lambda c: c is None or min(c) > 0.95
    for dr in page.get_drawings():
        r = dr["rect"]
        if white(dr.get("fill")) and white(dr.get("color")): continue
        if r.y0 < top or r.y1 > bot + 5: continue
        if r.width < 3 and r.height < 3: continue
        if r.width > 400 or (r.height < 2 and not rects): continue
        if zone.contains(r) and r.x0 > 200 and not any(not (r & tl).is_empty for tl in textlines): drects.append(r)
    def inked(r):
        pix = page.get_pixmap(dpi=40, clip=r, colorspace=pymupdf.csGRAY)
        px = pix.samples
        return px and sum(1 for b in px if b < 200) > max(3, 0.004 * len(px))
    def union(rs):
        f = pymupdf.Rect(rs[0])
        for r in rs[1:]: f |= r
        return f
    rects = [r for r in rects if inked(r)]
    allr = rects + drects
    if not allr: return None
    fig = union(allr)
    if overlaps_text(fig) and rects: fig = union(rects)
    if drects and not rects and union(drects).get_area() < 900: return None
    if not inked(fig): return None
    if fig.width < 25 or fig.height < 25 or overlaps_text(fig): return None
    # incluir etiquetas de texto pegadas a la figura (p.ej. "Vermell/Rojo")
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        for l in b["lines"]:
            if abs(l["dir"][1]) > 0.01: continue
            lr = pymupdf.Rect(l["bbox"])
            if lr.x0 > fig.x0 - 70 and lr.y0 > fig.y0 - 15 and lr.y1 < fig.y1 + 15 and lr.x0 >= 300 and zone.contains(lr):
                fig |= lr
    fig = (fig + (-6, -6, 6, 6)) & page.rect
    pix = page.get_pixmap(dpi=170, clip=fig)
    from PIL import Image, ImageChops
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    g = im.convert("L").point(lambda v: 255 if v > 235 else 0)
    bbox = ImageChops.invert(g).getbbox()
    if not bbox or (bbox[2]-bbox[0]) < 30 or (bbox[3]-bbox[1]) < 30: return None
    m = 10
    im = im.crop((max(0, bbox[0]-m), max(0, bbox[1]-m), min(im.width, bbox[2]+m), min(im.height, bbox[3]+m)))
    name = name.replace(".png", ".webp")
    im.save(os.path.join(outdir_img, name), "WEBP", quality=82)
    return name

def strip_watermark(doc):
    for page in doc:
        hit = False
        for b in page.get_text("dict")["blocks"]:
            if b["type"] != 0: continue
            for l in b["lines"]:
                if abs(l["dir"][1]) > 0.01:
                    page.add_redact_annot(pymupdf.Rect(l["bbox"])); hit = True
        if hit:
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                                  graphics=pymupdf.PDF_REDACT_LINE_ART_NONE, text=pymupdf.PDF_REDACT_TEXT_REMOVE)

def exam_meta(fname):
    base = os.path.splitext(fname)[0]
    m = re.match(r"(\d\d)([A-ZÇ]+)-([A-Z]+)(2?)$", unicodedata.normalize("NFC", base))
    yy, mon, place, v = m.groups()
    place = {"BCN": "Barcelona", "GIR": "Girona", "TAR": "Tarragona"}.get(place, place)
    mon_n = MONTHS[mon]
    eid = f"20{yy}-{mon_n:02d}-{m.group(3).lower()}-{'2' if v else '1'}"
    return eid, {"id": eid, "file": unicodedata.normalize("NFC", fname), "year": 2000 + int(yy), "month": mon_n,
                 "place": place, "version": 2 if v else 1}

def main(src, out):
    import shutil; shutil.rmtree(os.path.join(out, "img"), ignore_errors=True)
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    exams, questions, report = [], [], []
    for path in sorted(glob.glob(os.path.join(src, "*.pdf"))):
        eid, meta = exam_meta(os.path.basename(path))
        doc, qs, ans = extract(path, None, eid)
        clean = pymupdf.open(path); strip_watermark(clean)
        problems = []
        for n in range(1, 46):
            q = qs.get(n)
            if not q: problems.append(f"falta {n}"); continue
            if len(q["opts"]) != 4: problems.append(f"{n}: {len(q['opts'])} opciones")
            a = ans.get(n, set())
            annulled = len(a) > 1
            if not a: problems.append(f"{n}: sin respuesta")
            img = render_figure(clean, q, qs.get(n + 1), eid, os.path.join(out, "img"))
            ca, es = split_bilingual(q["text"], True)
            opts = []
            for k in "abcd":
                o_ca, o_es = split_bilingual(q["opts"].get(k, ""), False)
                opts.append({"id": k, "ca": o_ca, "es": o_es})
            questions.append({
                "id": f"{eid}-{n:02d}", "exam": eid, "n": n, "topic": topic_of(n),
                "ca": ca, "es": es, "options": opts,
                "answer": None if annulled or not a else next(iter(a)),
                "annulled": annulled, "image": img,
            })
        meta["annulled"] = [n for n in range(1, 46) if len(ans.get(n, ())) > 1]
        exams.append(meta)
        report.append((eid, problems))
    data = {"topics": [{"id": t, "name": nm, "from": a, "to": b} for a, b, t, nm in TOPICS],
            "exams": exams, "questions": questions}
    with open(os.path.join(out, "questions.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    for eid, p in report: print(eid, "OK" if not p else p)
    print(len(questions), "preguntas;", sum(1 for q in questions if q["image"]), "con figura")

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "examenes"),
         sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "build"))
