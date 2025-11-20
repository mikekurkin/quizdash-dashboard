#!/bin/sh
set -euo

: "${MAXMIND_ACCOUNT_ID:=}"
: "${MAXMIND_LICENSE_KEY:=}"
: "${MAXMIND_DB_PATH:=/app/data/geoip/GeoLite2-City.mmdb}"

DB_DIR=$(dirname "$MAXMIND_DB_PATH")
TMPDIR=$(mktemp -d)

if [ -f "$MAXMIND_DB_PATH" ]; then
  echo "MaxMind DB already present at $MAXMIND_DB_PATH"
else
  if [ -n "$MAXMIND_ACCOUNT_ID" ] && [ -n "$MAXMIND_LICENSE_KEY" ]; then
    echo "Downloading MaxMind DB to $MAXMIND_DB_PATH"
    mkdir -p "$DB_DIR"
    curl -sSL -u "${MAXMIND_ACCOUNT_ID}:${MAXMIND_LICENSE_KEY}" \
      'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz' \
      -o "$TMPDIR/maxmind.tar.gz"
    tar -xzf "$TMPDIR/maxmind.tar.gz" -C "$TMPDIR"
    MMDB_FILE=$(find "$TMPDIR" -type f -name '*.mmdb' -print -quit)

    if [ -z "$MMDB_FILE" ]; then
      echo "Could not locate *.mmdb inside archive; continuing without MaxMind"
    else
      mv "$MMDB_FILE" "$MAXMIND_DB_PATH"
      chown "$(id -u)":"$(id -g)" "$MAXMIND_DB_PATH"
    fi

    rm -rf "$TMPDIR"
  else
    echo "MAXMIND_ACCOUNT_ID / MAXMIND_LICENSE_KEY not set; skipping download"
  fi
fi

exec "$@"
