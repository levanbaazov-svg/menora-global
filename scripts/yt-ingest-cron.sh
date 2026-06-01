#!/bin/sh
# Gradual, scheduled ingestion of the community YouTube channel into the AI
# Rabbi knowledge base. Idempotent — each run resumes where the last left off
# and stops early when YouTube IP-blocks. Bounded to YT_MAX_NEW videos per run.
#
# Installed as a cron job (every few hours). Logs to /tmp/yt_ingest_cron.log.

export PATH="$HOME/Library/Python/3.9/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/simantovbaazov/Documents/GitHub/menora-global || exit 1

echo "===== $(date) =====" >> /tmp/yt_ingest_cron.log
YT_MAX_NEW=40 YT_MAX_CONSEC_BLOCKS=3 /usr/bin/python3 scripts/ingest-youtube.py >> /tmp/yt_ingest_cron.log 2>&1
echo "----- exit $? -----" >> /tmp/yt_ingest_cron.log
