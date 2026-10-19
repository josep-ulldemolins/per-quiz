"""Repara dos defectos de extracción en web/data/questions.json. Se puede ejecutar más de una vez.

1. Una cabecera de tema («UT3 Seguridad (7-10)») se coló en una opción.

La cabecera contiene una «/» propia, así que el corte catalán/castellano caía en ella: el castellano se quedaba
con la cabecera y el catalán con «texto ca / texto es». Se reconstruye el texto original, se quita la cabecera y
se vuelve a cortar. extract.py ya separa la cabecera al leer el PDF; esto arregla un banco generado antes.

2. Las etiquetas de color de una figura («Negre / Negro», «Groc/Amarillo») quedaron pegadas al texto.

    python3 scripts/fix_bank.py
"""
import json
import re
from pathlib import Path

BANK = Path(__file__).resolve().parent.parent / "web" / "data" / "questions.json"
HEADER = re.compile(r"[\s\uf0b7\uf020·•]*\bUT\s*\d+\b.*$", re.S)
COLOR = re.compile(r"\s*\b(Negre|Groc|Vermell|Verd|Blanc)\s*/\s*(Negro|Amarillo|Rojo|Verde|Blanco)\b", re.I)


def strip_colors(obj):
    """Quita las etiquetas de color. Si la etiqueta es todo el texto, era la opción: cada idioma se queda la suya."""
    full = COLOR.fullmatch(obj["es"].strip())
    if full:
        obj["ca"], obj["es"] = full.group(1).capitalize(), full.group(2).capitalize()
        return True
    changed = False
    for lang in ("es", "ca"):
        new = re.sub(r"\s+", " ", COLOR.sub("", obj[lang])).strip()
        if new != obj[lang]:
            obj[lang], changed = new, True
    return changed


def clean(s):
    return re.sub(r"\s+", " ", HEADER.sub("", s).replace("", " ").replace("", " ")).strip()


def repair(opt):
    if not (HEADER.search(opt["es"]) or HEADER.search(opt["ca"])):
        return False
    raw = clean(f"{opt['ca']} / {opt['es']}")
    parts = [clean(p) for p in raw.split("/")]
    parts = [p for p in parts if p]
    if len(parts) == 2:
        opt["ca"], opt["es"] = parts
    elif len(parts) == 1:
        opt["ca"] = opt["es"] = parts[0]
    else:
        # Más de una «/» en el texto: partir por la mitad de las barras.
        mid = len(parts) // 2
        opt["ca"], opt["es"] = " / ".join(parts[:mid]), " / ".join(parts[mid:])
    return True


def main():
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    fixed = [q["id"] for q in bank["questions"] for o in q["options"] if repair(o)]
    colors = [q["id"] for q in bank["questions"] for o in [q, *q["options"]] if strip_colors(o)]
    BANK.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(fixed)} opciones con cabecera reparadas, {len(colors)} textos sin etiquetas de color")
    left = [q["id"] for q in bank["questions"] for o in q["options"] if HEADER.search(o["es"] + o["ca"])]
    if left:
        print("Siguen con cabecera:", ", ".join(left))


if __name__ == "__main__":
    main()
