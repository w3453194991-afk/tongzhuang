#!/usr/bin/env bash
# 更新线上代码：git pull → 重启服务（数据在 data/store.json，不受影响）
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/xiaoman}"
SERVICE="${SERVICE:-xiaoman}"
PORT="${PORT:-8765}"

[ "$(id -u)" = "0" ] || { echo "请用 root 运行"; exit 1; }
cd "$APP_DIR"

if [ -d .git ]; then
  echo "==> git pull"
  git pull --ff-only
else
  echo "[!] $APP_DIR 不是 git 仓库，请用你上传的方式覆盖文件后再执行下一步"
fi

echo "==> 重启 $SERVICE"
systemctl restart "$SERVICE"
sleep 2
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/index.html" >/dev/null && echo "==> 已重启，本机自检通过" \
  || { echo "[x] 自检失败：journalctl -u $SERVICE -n 50 --no-pager"; exit 1; }
