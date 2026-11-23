#!/usr/bin/env bash
# 每 2 分钟检查一次 GitHub，有新提交就拉下来（cron 用，不重启服务）
# 若本次改动涉及 tools/server.js，会自动重启 xiaoman 服务
set -uo pipefail
APP_DIR="${APP_DIR:-/opt/xiaoman}"
SERVICE="${SERVICE:-xiaoman}"
BRANCH="${BRANCH:-main}"
cd "$APP_DIR" || exit 0
[ -d .git ] || exit 0

git fetch -q origin "$BRANCH" || exit 0
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse "origin/$BRANCH" 2>/dev/null)" || exit 0
[ "$local_sha" = "$remote_sha" ] && exit 0

# 记录 server.js 是否会变
server_before="$(md5sum tools/server.js 2>/dev/null | awk '{print $1}')"
git reset --hard -q "origin/$BRANCH" || exit 1
server_after="$(md5sum tools/server.js 2>/dev/null | awk '{print $1}')"

if [ "$server_before" != "$server_after" ]; then
  systemctl restart "$SERVICE" >/dev/null 2>&1 || true
fi
echo "$(date '+%F %T') 已更新 $local_sha -> $remote_sha" >> "$APP_DIR/logs/autopull.log"
