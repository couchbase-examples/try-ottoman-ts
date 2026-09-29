#!/usr/bin/env bash
#
# Starts a local Couchbase Server in Docker with the travel-sample bucket loaded,
# for running the test suite. Safe to re-run: each step is skipped if already done.
#
# Usage:
#   scripts/start-couchbase.sh                   # start container, init cluster, load travel-sample
#   scripts/start-couchbase.sh --container-only  # only start the container (lets it boot in the background)

set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

# Prints the value of $1 from the project's .env file, if there is one.
env_file_value() {
  [ -f "$ROOT/.env" ] || return 0
  sed -n "s/^$1=//p" "$ROOT/.env" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\\(.*\\)'$/\\1/"
}

# Like the app (dotenv), use the environment first, then .env, then the defaults.
CONTAINER=${CB_CONTAINER:-try-ottoman-cb}
IMAGE=${CB_IMAGE:-couchbase/server:enterprise-7.6.8}
USERNAME=${DB_USERNAME:-$(env_file_value DB_USERNAME)}
USERNAME=${USERNAME:-Administrator}
PASSWORD=${DB_PASSWORD:-$(env_file_value DB_PASSWORD)}
PASSWORD=${PASSWORD:-password}
TIMEOUT=${CB_TIMEOUT:-600}
SAMPLE=travel-sample

log() { echo "[couchbase] $*"; }

# All REST calls run inside the container, so this works whether or not ports are published.
rest() { docker exec "$CONTAINER" curl -sf -u "$USERNAME:$PASSWORD" "$@"; }

# Prints the single number returned by a `SELECT RAW COUNT(*) ...` statement.
query_count() {
  rest http://localhost:8093/query/service --data-urlencode "statement=$1" \
    | tr -d '[:space:]' | grep -o '"results":\[[0-9]*\]' | grep -o '[0-9]\+'
}

wait_for() {
  local desc=$1; shift
  local deadline=$((SECONDS + TIMEOUT))
  log "Waiting for $desc..."
  until "$@" >/dev/null 2>&1; do
    if ((SECONDS >= deadline)); then
      log "Timed out after ${TIMEOUT}s waiting for $desc" >&2
      exit 1
    fi
    sleep 3
  done
}

start_container() {
  if [ -n "$(docker ps -q -f name="^${CONTAINER}$")" ]; then
    log "Container $CONTAINER already running"
  elif [ -n "$(docker ps -aq -f name="^${CONTAINER}$")" ]; then
    log "Starting existing container $CONTAINER"
    docker start "$CONTAINER" >/dev/null
  else
    log "Creating container $CONTAINER from $IMAGE"
    docker run -d --name "$CONTAINER" \
      -p 8091-8097:8091-8097 -p 11210:11210 \
      "$IMAGE" >/dev/null
  fi
}

rest_api_up() { docker exec "$CONTAINER" curl -s -o /dev/null http://localhost:8091/pools; }
cluster_initialized() { rest http://localhost:8091/pools/default; }
sample_bucket_exists() { rest "http://localhost:8091/pools/default/buckets/$SAMPLE"; }
install_sample() {
  rest -X POST http://localhost:8091/sampleBuckets/install -d "[\"$SAMPLE\"]" || sample_bucket_exists
}
sample_load_finished() {
  local tasks
  # Fetch first so a failed request counts as "not finished" rather than "no loading task".
  tasks=$(rest http://localhost:8091/pools/default/tasks) || return 1
  ! grep -q loadingSampleBucket <<<"$tasks"
}

indexes_online() {
  local total pending
  total=$(query_count "SELECT RAW COUNT(*) FROM system:indexes WHERE bucket_id = \"$SAMPLE\"")
  pending=$(query_count "SELECT RAW COUNT(*) FROM system:indexes WHERE bucket_id = \"$SAMPLE\" AND state != \"online\"")
  [ "${total:-0}" -gt 0 ] && [ "${pending:-1}" -eq 0 ]
}

start_container
if [ "${1:-}" = "--container-only" ]; then
  exit 0
fi

wait_for "Couchbase REST API" rest_api_up

if cluster_initialized >/dev/null 2>&1; then
  log "Cluster already initialized"
else
  log "Initializing cluster"
  docker exec "$CONTAINER" couchbase-cli cluster-init -c localhost \
    --cluster-username "$USERNAME" --cluster-password "$PASSWORD" \
    --services data,index,query \
    --cluster-ramsize 1024 --cluster-index-ramsize 512 \
    --index-storage-setting default
  wait_for "cluster to accept requests" cluster_initialized
fi

if sample_bucket_exists >/dev/null 2>&1; then
  log "$SAMPLE bucket already exists"
else
  log "Loading $SAMPLE sample bucket"
  wait_for "sample bucket install to be accepted" install_sample
fi

wait_for "$SAMPLE to finish loading" sample_load_finished
wait_for "$SAMPLE indexes to come online" indexes_online

log "Couchbase is ready with $SAMPLE loaded"
