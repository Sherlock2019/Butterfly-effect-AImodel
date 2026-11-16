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

# Public address for links from another machine. Order: ACMP_PUBLIC_HOST (an IP or a DNS name, e.g.
# an Elastic IP or a domain) → EC2 instance metadata (IMDSv2, then v1; works without internet) →
# checkip.amazonaws.com → api.ipify.org. Prints nothing if none answers with an IPv4 address.
public_host() {
    if [[ -n "${ACMP_PUBLIC_HOST:-}" ]]; then echo "$ACMP_PUBLIC_HOST"; return; fi
    local ip="" token=""
    token="$(curl -s --max-time 2 -X PUT http://169.254.169.254/latest/api/token \
        -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null || true)"
    if [[ -n "$token" ]]; then
        ip="$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $token" \
            http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
    fi
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || \
        ip="$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || \
        ip="$(curl -s --max-time 3 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || \
        ip="$(curl -s --max-time 3 https://api.ipify.org 2>/dev/null | tr -d '[:space:]' || true)"
    [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && echo "$ip" || true
}

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
    local origins public_ip
    public_ip="$(public_host)"
    origins="$public_ip,$(hostname -I 2>/dev/null | tr ' ' ',')"
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
    echo "Butterfly Effect Prediction (ACMP) is running (standalone):"
    echo "  1 What problem?        http://127.0.0.1:$PORT/briefing"
    echo "  2 What is it?          http://127.0.0.1:$PORT/what"
    echo "  3 How it solves it     http://127.0.0.1:$PORT/how"
    echo "  4 Test it              http://127.0.0.1:$PORT/"
    echo "  5 What next            http://127.0.0.1:$PORT/next"
    echo "  Logs                   $LOG"
    echo
    if [[ -n "$public_ip" ]]; then
        echo "Public links (from any browser; open inbound TCP $PORT in the security group / firewall):"
        echo "  1 What problem?        http://$public_ip:$PORT/briefing"
        echo "  2 What is it?          http://$public_ip:$PORT/what"
        echo "  3 How it solves it     http://$public_ip:$PORT/how"
        echo "  4 Test it              http://$public_ip:$PORT/"
        echo "  5 What next            http://$public_ip:$PORT/next"
        echo "  No login: anyone who can reach this address can use ACMP."
    else
        echo "Public links: no public IP detected. Set it and restart, e.g."
        echo "  ACMP_PUBLIC_HOST=<public-ip-or-dns> ./start.sh"
    fi
    echo
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
