#!/usr/bin/env python3
"""Ingest a YouTube channel's talks into torah_sources for the AI Rabbi RAG.

Fetches Russian auto-captions per video (youtube-transcript-api), chunks them,
embeds with OpenAI, and upserts into public.torah_sources.

Usage:
  python3 scripts/ingest-youtube.py                 # default channel below
  python3 scripts/ingest-youtube.py @SomeChannel    # another channel
  python3 scripts/ingest-youtube.py --limit 10      # first N videos (testing)

Idempotent: skips videos already stored (by ref = "yt:<video_id>").
Requires: yt-dlp, youtube-transcript-api  (pip install --user ...)
Env (from .env): HASURA_GRAPHQL_ENDPOINT, HASURA_GRAPHQL_ADMIN_SECRET, OPENAI_API_KEY
"""
import json, os, re, subprocess, sys, time, urllib.request

# ── env ────────────────────────────────────────────────────────────────────
def load_env(path=".env"):
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()
HASURA = os.environ.get("HASURA_GRAPHQL_ENDPOINT", "")
SECRET = os.environ.get("HASURA_GRAPHQL_ADMIN_SECRET", "")
OPENAI = os.environ.get("OPENAI_API_KEY", "")
if not HASURA or not SECRET or not OPENAI:
    print("Missing HASURA/OPENAI env"); sys.exit(1)
SQL_URL = re.sub(r"/v1/graphql/?$", "", HASURA) + "/v2/query"

# ── args ───────────────────────────────────────────────────────────────────
CHANNEL = "@MENORAyoutube"
LIMIT = None
args = sys.argv[1:]
for i, a in enumerate(args):
    if a == "--limit" and i + 1 < len(args):
        LIMIT = int(args[i + 1])
    elif a.startswith("@") or "youtube.com" in a:
        CHANNEL = a

COLLECTION = "rav_kaminetzki"
AUTHOR = "Раввин Каминецкий"
CATEGORY = "community_rabbi"
EMBED_MODEL = "text-embedding-3-small"

from youtube_transcript_api import YouTubeTranscriptApi  # noqa: E402
try:
    from youtube_transcript_api.proxies import GenericProxyConfig, WebshareProxyConfig
except Exception:
    GenericProxyConfig = WebshareProxyConfig = None

# Pace + retry (YouTube IP-blocks aggressive transcript scraping).
DELAY = float(os.environ.get("YT_DELAY", "2.5"))
BACKOFFS = [30, 90, 180, 300]  # seconds to wait between IpBlocked retries

def make_api():
    # Optional proxy to avoid IP blocks: Webshare (YT_WEBSHARE_USER/PASS) or a
    # generic HTTP(S) proxy (YT_PROXY=http://user:pass@host:port).
    if WebshareProxyConfig and os.environ.get("YT_WEBSHARE_USER"):
        return YouTubeTranscriptApi(proxy_config=WebshareProxyConfig(
            proxy_username=os.environ["YT_WEBSHARE_USER"],
            proxy_password=os.environ.get("YT_WEBSHARE_PASS", "")))
    if GenericProxyConfig and os.environ.get("YT_PROXY"):
        p = os.environ["YT_PROXY"]
        return YouTubeTranscriptApi(proxy_config=GenericProxyConfig(http_url=p, https_url=p))
    return YouTubeTranscriptApi()

# ── helpers ────────────────────────────────────────────────────────────────
def run_sql(sql, read_only=False):
    body = json.dumps({"type": "run_sql", "args": {
        "source": "default", "sql": sql, "read_only": read_only}}).encode()
    req = urllib.request.Request(SQL_URL, data=body, headers={
        "Content-Type": "application/json", "X-Hasura-Admin-Secret": SECRET})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def sql_str(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def sql_vec(v):
    return "'[" + ",".join(repr(float(x)) for x in v) + "]'::vector"

def existing_refs():
    res = run_sql("SELECT DISTINCT ref FROM public.torah_sources WHERE collection='%s';" % COLLECTION, True)
    rows = res.get("result") or []
    return {r[0] for r in rows[1:]}  # drop header

def list_videos(channel):
    url = channel if "youtube.com" in channel else f"https://www.youtube.com/{channel}/videos"
    out = subprocess.run(
        ["yt-dlp", "--flat-playlist", "--print", "%(id)s\t%(title)s", url],
        capture_output=True, text=True)
    vids = []
    for line in out.stdout.splitlines():
        if "\t" in line:
            vid, title = line.split("\t", 1)
            vids.append((vid.strip(), title.strip()))
    return vids

_API = None
def fetch_transcript(vid):
    global _API
    if _API is None:
        _API = make_api()
    ft = _API.fetch(vid, languages=["ru"])
    return " ".join(s["text"].replace("\n", " ") for s in ft.to_raw_data() if s["text"].strip())

def chunk_text(text, chunk_words=220):
    words = text.split()
    chunks, buf = [], []
    for w in words:
        buf.append(w)
        if len(buf) >= chunk_words:
            chunks.append(" ".join(buf)); buf = []
    if buf:
        chunks.append(" ".join(buf))
    return chunks

def embed(texts):
    body = json.dumps({"model": EMBED_MODEL, "input": texts}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/embeddings", data=body, headers={
        "Content-Type": "application/json", "Authorization": "Bearer " + OPENAI})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())["data"]
    return [d["embedding"] for d in sorted(data, key=lambda d: d["index"])]

def store(rows):
    if not rows:
        return
    values = ",\n".join(
        "(%s,%s,%s,%s,%s,%s,%d,%s,%d,%s,%d)" % (
            sql_str(r["collection"]), sql_str(r["ref"]), sql_str(r["title"]),
            sql_str(r["author"]), sql_str(r["category"]), "'{}'", r["authority"],
            sql_str(r["text_ru"]), r["chunk_index"], sql_vec(r["embedding"]), r["token_count"])
        for r in rows)
    sql = (
        "INSERT INTO public.torah_sources "
        "(collection, ref, title, author, category, tags, authority, text_ru, chunk_index, embedding, token_count) "
        "VALUES %s ON CONFLICT (ref, chunk_index) DO UPDATE SET "
        "text_ru=EXCLUDED.text_ru, embedding=EXCLUDED.embedding, title=EXCLUDED.title;" % values)
    res = run_sql(sql)
    if isinstance(res, dict) and res.get("error"):
        raise RuntimeError(res["error"])

# ── main ───────────────────────────────────────────────────────────────────
def main():
    done = existing_refs()
    print(f"Already stored videos: {len(done)}")
    videos = list_videos(CHANNEL)
    if LIMIT:
        videos = videos[:LIMIT]
    print(f"Channel videos: {len(videos)}")

    total_chunks = 0
    for n, (vid, title) in enumerate(videos, 1):
        ref = f"yt:{vid}"
        if ref in done:
            print(f"[{n}/{len(videos)}] · skip {vid}")
            continue
        text = None
        for attempt in range(len(BACKOFFS) + 1):
            try:
                text = fetch_transcript(vid)
                break
            except Exception as e:
                name = type(e).__name__
                if "IpBlocked" in name or "TooManyRequests" in name or "RequestBlocked" in name:
                    if attempt < len(BACKOFFS):
                        wait = BACKOFFS[attempt]
                        print(f"[{n}/{len(videos)}] … IpBlocked {vid}, backoff {wait}s")
                        time.sleep(wait)
                        continue
                    print(f"[{n}/{len(videos)}] x blocked (gave up) {vid}")
                else:
                    print(f"[{n}/{len(videos)}] x no transcript {vid}: {name}")
                break
        if not text:
            time.sleep(DELAY)
            continue
        if len(text) < 200:
            print(f"[{n}/{len(videos)}] o empty {vid}")
            continue
        chunks = chunk_text(text)
        try:
            embs = embed(chunks)
        except Exception as e:
            print(f"[{n}/{len(videos)}] embed fail {vid}: {str(e)[:80]}")
            continue
        rows = [{
            "collection": COLLECTION, "ref": ref,
            "title": title if len(chunks) == 1 else f"{title} ({i+1})",
            "author": AUTHOR, "category": CATEGORY, "authority": 1,
            "text_ru": c[:8000], "chunk_index": i, "embedding": embs[i],
            "token_count": int(len(c.split()) * 1.3),
        } for i, c in enumerate(chunks)]
        try:
            store(rows)
            total_chunks += len(rows)
            print(f"[{n}/{len(videos)}] ✓ {vid} — {len(rows)} chunks — {title[:50]}")
        except Exception as e:
            print(f"[{n}/{len(videos)}] store fail {vid}: {str(e)[:120]}")
        time.sleep(DELAY)  # be polite to YouTube

    print(f"\n✅ Done. Stored {total_chunks} new chunks.")

if __name__ == "__main__":
    main()
