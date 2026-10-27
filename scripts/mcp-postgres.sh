#!/bin/sh
# Postgres helper for Claude Code (the "postgres" MCP server in .mcp.json).
#
# Runs crystaldba/postgres-mcp in Docker against the local database, read-only.
# Each helper is tagged with the Claude session that started it and is removed
# when that session ends — however it ends (closed, crashed, killed). Helpers
# left by sessions that are already gone are removed on the next start.
# Several Claude sessions at once each keep their own helper.

cd "$(dirname "$0")/.." || exit 1
set -a; . ./.env; set +a

owner=$PPID
name="pupbox-mcp-postgres-$owner-$$"

# Leftovers from sessions that no longer exist.
for c in $(docker ps -aq --filter label=pupbox.mcp=postgres 2>/dev/null); do
  pid=$(docker inspect -f '{{ index .Config.Labels "pupbox.mcp.owner" }}' "$c" 2>/dev/null)
  kill -0 "$pid" 2>/dev/null || docker rm -f "$c" >/dev/null 2>&1
done

# When this session goes away, take its helper with it. (Kept off stdout:
# that line is the MCP conversation itself.)
( while kill -0 "$owner" 2>/dev/null; do sleep 5; done; docker rm -f "$name" ) </dev/null >/dev/null 2>&1 &

exec docker run -i --rm --init --name "$name" \
  --label pupbox.mcp=postgres --label pupbox.mcp.owner="$owner" \
  -e DATABASE_URI="$(printf %s "$DATABASE_URL" | sed 's/@localhost:/@host.docker.internal:/')" \
  crystaldba/postgres-mcp --access-mode=restricted
