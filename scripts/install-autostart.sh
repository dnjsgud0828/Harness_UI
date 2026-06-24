#!/usr/bin/env bash
# install-autostart.sh — macOS 로그인 자동 시작 등록/해제.
# 사용:
#   ./scripts/install-autostart.sh install
#   ./scripts/install-autostart.sh uninstall
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_PATH="$(pwd)"
PLIST_NAME="com.harness-ui.dev.plist"
PLIST_SRC="$PROJECT_PATH/scripts/$PLIST_NAME.template"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"

case "${1:-}" in
  install)
    mkdir -p "$HOME/Library/LaunchAgents"
    sed "s|{{PROJECT_PATH}}|$PROJECT_PATH|g" "$PLIST_SRC" > "$PLIST_DST"
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    launchctl load -w "$PLIST_DST"
    echo "✓ 등록 완료: $PLIST_DST"
    echo "  로그인 시 자동 시작. 즉시 실행도 됩니다."
    ;;
  uninstall)
    if [[ -f "$PLIST_DST" ]]; then
      launchctl unload "$PLIST_DST" 2>/dev/null || true
      rm -f "$PLIST_DST"
      echo "✓ 해제 완료."
    else
      echo "이미 해제 상태."
    fi
    ;;
  *)
    echo "사용: $0 {install|uninstall}"
    exit 1
    ;;
esac
