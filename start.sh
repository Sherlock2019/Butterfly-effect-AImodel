#!/usr/bin/env bash
# ACMP · Butterfly Eye View launcher. Standalone: everything runs from this repository.
#   ./start.sh            fresh launch: stop a running copy, install if needed, rebuild, start on :3020
#   ./start.sh stop | status | restart | build | test
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
PORT="${ACMP_PORT:-3020}"
LOG="$ROOT/logs/web.log"
mkdir -p "$ROOT/logs"

pid_on_port() { ss -ltnp 2>/dev/null | grep -E ":$PORT\b" | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2; }

status() {
    local pid; pid="$(pid_on_port || true)"
    if [[ -n "$pid" ]]; then echo "ACMP    running  http://127.0.0.1:$PORT/  (pid $pid)"; else echo "ACMP    stopped"; fi
    # NPLM is optional: it translates actions into phrases in the routing layer
    local nplm="${NPLM_URL:-http://127.0.0.1:8001}"
    if curl -s -o /dev/null --max-time 2 "$nplm/health"; then echo "NPLM    reachable at $nplm (phrases on)"; else echo "NPLM    not running at $nplm (optional: actions are routed from their words)"; fi
}

stop() {
    local pid; pid="$(pid_on_port || true)"
    if [[ -n "$pid" ]]; then
        # stop by port, never by process name: other Next apps may be running
        kill "$pid" 2>/dev/null || true
        for _ in $(seq 1 20); do [[ -z "$(pid_on_port || true)" ]] && break; sleep 0.5; done
        echo "ACMP stopped"
    else
        echo "ACMP not running"
    fi
}

start() {
    # always a fresh launch: stop a running copy, clear the dev build cache, rebuild on start
    if [[ -n "$(pid_on_port || true)" ]]; then stop; fi
    [[ -d node_modules/next && -f public/cesium/Cesium.js ]] || npm install --no-audit --no-fund
    rm -rf .next/dev
    echo "starting ACMP on :$PORT (fresh build)…"
    local origins
    origins="$(curl -s --max-time 3 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true),$(hostname -I 2>/dev/null | tr ' ' ',')"
    ACMP_ALLOWED_DEV_ORIGINS="${ACMP_ALLOWED_DEV_ORIGINS:-$origins}" setsid nohup npx next dev -p "$PORT" -H 0.0.0.0 > "$LOG" 2>&1 < /dev/null &
    # wait until the console page has compiled and answers 200 (first compile can take a while)
    local code=000
    for _ in $(seq 1 180); do
        code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://127.0.0.1:$PORT/" || true)"
        [[ "$code" == "200" ]] && break
        sleep 1
    done
    if [[ "$code" != "200" ]]; then echo "ACMP did not answer 200 (last: $code); see $LOG" >&2; tail -20 "$LOG" >&2; return 1; fi
    echo
    echo "ACMP · Butterfly Eye View is running (standalone):"
    echo "  Console (start here)   http://127.0.0.1:$PORT/            scenarios · write an action · cascade"
    echo "  A scenario             http://127.0.0.1:$PORT/?scenario=lightning_datacenter"
    echo "  World stack            http://127.0.0.1:$PORT/briefing#worlds"
    echo "  Recorded examples      /chat · /scenarios · /inference · /lab · /classic"
    echo "  Logs                   $LOG"
    status
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    status) status ;;
    restart) stop; start ;;
    build) npx next build ;;
    test) npm test ;;
    *) echo "usage: $0 [start|stop|status|restart|build|test]"; exit 1 ;;
esac
