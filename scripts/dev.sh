#!/usr/bin/env bash
# dev.sh — Harness Studio dev 서버 백그라운드 관리.
# 사용:
#   ./scripts/dev.sh start    백그라운드 시작 (이미 떠 있으면 무시)
#   ./scripts/dev.sh stop     종료
#   ./scripts/dev.sh restart  재시작
#   ./scripts/dev.sh status   상태
#   ./scripts/dev.sh logs     실시간 로그 (Ctrl+C로 빠짐)
#   ./scripts/dev.sh watch    크래시 시 자동 재시작 (Ctrl+C로 빠짐, foreground)

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PIDFILE="$ROOT/.dev.pid"
LOGFILE="$ROOT/.dev.log"
PORT="${PORT:-3000}"

is_running() {
  [[ -f "$PIDFILE" ]] || return 1
  local pid; pid="$(cat "$PIDFILE" 2>/dev/null || echo "")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

start() {
  if is_running; then
    echo "이미 실행 중입니다. pid=$(cat "$PIDFILE")  port=$PORT"
    return 0
  fi
  # 같은 포트에서 떠 있는 잔여 프로세스 정리 (백업 안전)
  if lsof -ti tcp:$PORT >/dev/null 2>&1; then
    echo "포트 $PORT 점유 중인 프로세스를 종료합니다."
    lsof -ti tcp:$PORT | xargs -I{} sh -c "kill {} 2>/dev/null || true"
    sleep 1
  fi
  # nohup으로 백그라운드 + 로그 분리
  nohup env PORT="$PORT" NEXT_TELEMETRY_DISABLED=1 npx next dev > "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
  if is_running; then
    echo "시작됨. pid=$(cat "$PIDFILE")  port=$PORT  log=$LOGFILE"
    echo "→ http://localhost:$PORT"
  else
    echo "시작 실패. 로그:"
    tail -20 "$LOGFILE"
    return 1
  fi
}

stop() {
  # 1) 우리 PID와 그 자식만 정확히 정리. 다른 프로젝트의 next 프로세스는 절대 건드리지 않음.
  if [[ -f "$PIDFILE" ]]; then
    local pid; pid="$(cat "$PIDFILE")"
    if kill -0 "$pid" 2>/dev/null; then
      pkill -P "$pid" 2>/dev/null || true   # 우리 PID의 직접 자식만
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PIDFILE"
  fi
  # 2) 우리 포트에 남은 잔여 프로세스만 정리 (다른 포트엔 영향 0).
  local pids
  pids="$(lsof -ti tcp:"$PORT" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs -I{} sh -c "kill {} 2>/dev/null || true"
  fi
  echo "정지됨. (포트 $PORT 만)"
}

status() {
  if is_running; then
    local pid; pid="$(cat "$PIDFILE")"
    echo "실행 중. pid=$pid  port=$PORT"
    echo "→ http://localhost:$PORT"
    echo "최근 로그:"
    tail -5 "$LOGFILE" 2>/dev/null || true
  else
    echo "정지 상태."
  fi
}

logs() {
  if [[ ! -f "$LOGFILE" ]]; then
    echo "로그 파일이 없습니다."
    return 1
  fi
  tail -F "$LOGFILE"
}

watch() {
  # 크래시 시 자동 재시작. foreground로 동작 (Ctrl+C로 중단).
  trap 'echo; echo "watch 종료"; stop; exit 0' INT TERM
  while true; do
    if ! is_running; then
      echo "[$(date '+%H:%M:%S')] 서버가 꺼져있음 → 시작"
      start || true
    fi
    sleep 5
  done
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 1; start ;;
  status)  status ;;
  logs)    logs ;;
  watch)   watch ;;
  *)
    echo "사용: $0 {start|stop|restart|status|logs|watch}"
    exit 1
    ;;
esac
