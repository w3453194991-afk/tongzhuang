#!/usr/bin/env bash
# 更新线上代码：拉取 origin/main → 重启服务（数据在 data/store.json，不受影响）
# 用法：bash tools/deploy/update.sh
# 说明：本地若被强推（比如改写历史），会自动 fetch + reset --hard origin/main 对齐，不会卡在 "divergent branches"
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/xiaoman}"
SERVICE="${SERVICE:-xiaoman}"
PORT="${PORT:-8765}"
BRANCH="${BRANCH:-main}"

[ "$(id -u)" = "0" ] || { echo "请用 root 运行"; exit 1; }
cd "$APP_DIR"

if [ -d .git ]; then
  echo "==> 拉取 origin/$BRANCH"
  git fetch --prune origin
  been="$(git rev-parse HEAD)"
  # 优先快进；失败（历史被改写/本地脏）就硬对齐到远端
  if ! git pull --ff-only origin "$BRANCH" >/dev/null 2>&1; then
    echo "[!] 无法快进（远端可能被强推过），改为对齐 origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
    git clean -fd -e data -e logs >/dev/null 2>&1 || true
  fi
  now="$(git rev-parse HEAD)"
  if [ "$been" = "$now" ]; then
    echo "==> 已经是最新（$(git rev-parse --short HEAD)），只重启服务"
  else
    echo "==> 已更新：$(git rev-parse --short "$been") → $(git rev-parse --short "$now")"
  fi
else
  echo "[!] $APP_DIR 不是 git 仓库（你用的是上传覆盖方式），跳过拉取，直接重启"
fi

echo "==> 重启 $SERVICE"
systemctl restart "$SERVICE"
sleep 2
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/index.html" >/dev/null \
  && echo "==> 已重启，本机自检通过（浏览器 Ctrl+F5 刷新即可看到新内容）" \
  || { echo "[x] 自检失败：journalctl -u $SERVICE -n 50 --no-pager"; exit 1; }
