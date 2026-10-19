"""Une preguntas repetidas entre convocatorias y genera el banco final para la web."""
import json, sys, os, re, unicodedata, collections, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "build")
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "web", "data")
d = json.load(open(os.path.join(src, "questions.json"), encoding="utf-8"))

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(c for c in s if c.isalnum())

SPACED = re.compile(r"(?<![\w])(?:[^\W\d_] ){3,}[^\W\d_](?![\w])")
def clean(s):
    s = SPACED.sub(lambda m: m.group(0).replace(" ", ""), s)
    s = re.sub(r"^[\s.;:,/*-]+", "", s).strip()
    s = re.sub(r"\s+([.,;:?!])", r"\1", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s[:1].upper() + s[1:] if s else s

def ahash(path):
    im = Image.open(path).convert("L").resize((16, 16))
    px = list(im.tobytes()); m = sum(px) / len(px)
    return [p > m for p in px]

hashes = {}
for q in d["questions"]:
    if q["image"]: hashes[q["id"]] = ahash(os.path.join(src, "img", q["image"]))

def same_img(a, b):
    if not a["image"] and not b["image"]: return True
    if not a["image"] or not b["image"]: return False
    return sum(x != y for x, y in zip(hashes[a["id"]], hashes[b["id"]])) <= 30

groups = collections.defaultdict(list)   # key -> list of clusters
for q in d["questions"]:
    if q["annulled"] or not q["answer"]: continue
    key = norm(q["es"]) + "|" + "|".join(sorted(norm(o["es"]) for o in q["options"]))
    for cl in groups[key]:
        if same_img(cl[0], q): cl.append(q); break
    else: groups[key].append([q])

exams = {e["id"]: e for e in d["exams"]}
bank, conflicts = [], []
for clusters in groups.values():
    for cl in clusters:
        rep = max(cl, key=lambda q: q["exam"])   # la versión más reciente
        def ans_text(q): return norm([o for o in q["options"] if o["id"] == q["answer"]][0]["es"])
        votes = collections.Counter(ans_text(q) for q in cl)
        best, n = votes.most_common(1)[0]
        answer = [o["id"] for o in rep["options"] if norm(o["es"]) == best][0]
        item = {
            "id": rep["id"], "topic": rep["topic"],
            "es": clean(rep["es"]), "ca": clean(rep["ca"]),
            "options": [{"id": o["id"], "es": clean(o["es"]), "ca": clean(o["ca"])} for o in rep["options"]],
            "answer": answer, "image": rep["image"],
            "sources": sorted({f"{q['exam']}#{q['n']}" for q in cl}),
        }
        if len(votes) > 1:
            item["disputed"] = True
            conflicts.append((item["id"], dict(votes)))
        bank.append(item)

bank.sort(key=lambda q: q["id"])
os.makedirs(os.path.join(dst, "img"), exist_ok=True)
for f in os.listdir(os.path.join(dst, "img")): os.remove(os.path.join(dst, "img", f))
for q in bank:
    if q["image"]: shutil.copy(os.path.join(src, "img", q["image"]), os.path.join(dst, "img", q["image"]))
out = {"generated": "per-quiz", "topics": d["topics"], "exams": d["exams"], "questions": bank}
with open(os.path.join(dst, "questions.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
by_topic = collections.Counter(q["topic"] for q in bank)
print(len(bank), "preguntas únicas de", sum(len(c) for cl in groups.values() for c in cl))
print(dict(by_topic))
print("con respuesta discutida:", conflicts)
