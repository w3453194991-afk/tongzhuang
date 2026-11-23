#!/usr/bin/env bash
# 小满童装 · 选款与报价中台 —— 一键安装（Linux 服务器，Node 服务 + systemd）
# 用法：
#   bash tools/deploy/install.sh                 # 默认 /opt/xiaoman、0.0.0.0:8765
#   APP_DIR=/www/xiaoman PORT=9000 bash tools/deploy/install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/xiaoman}"
PORT="${PORT:-8765}"
HOST="${HOST:-0.0.0.0}"
SERVICE="${SERVICE:-xiaoman}"
NODE_MIN=18

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "请用 root 运行：sudo bash $0"

# ---------- 1. 目录 ----------
[ -f "$APP_DIR/index.html" ] || die "$APP_DIR 里没有 index.html，请先把代码放到该目录（git clone / 上传解压）"
cd "$APP_DIR"
mkdir -p data logs
say "应用目录：$APP_DIR"

# ---------- 2. Node ----------
need_node=1
if command -v node >/dev/null 2>&1; then
  ver="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [ "${ver:-0}" -ge "$NODE_MIN" ]; then need_node=0; say "已装 Node $(node -v)"; fi
fi
if [ "$need_node" = "1" ]; then
  say "安装 Node.js ${NODE_MIN}+ ..."
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) node_arch="x64" ;;
    aarch64|arm64) node_arch="arm64" ;;
    *) die "不支持的架构：$arch，请手动安装 Node 20" ;;
  esac
  NODE_VER="v20.19.0"
  # 优先国内镜像，失败再走官方源
  for base in "https://npmmirror.com/mirrors/node" "https://nodejs.org/dist"; do
    url="$base/$NODE_VER/node-$NODE_VER-linux-$node_arch.tar.xz"
    say "下载 $url"
    if curl -fsSL --connect-timeout 15 "$url" -o /tmp/node.tar.xz; then
      tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
      rm -f /tmp/node.tar.xz
      if command -v node >/dev/null 2>&1 && [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -ge "$NODE_MIN" ]; then
        need_node=0; say "Node 安装完成：$(node -v)"; break
      fi
    fi
  done
  [ "$need_node" = "0" ] || die "Node 自动安装失败，请手动安装 Node 18+ 后重跑"
fi
NODE_BIN="$(command -v node)"

# ---------- 3. systemd ----------
say "写入 systemd 服务：/$SERVICE"
cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=XIAOMAN KIDS Selection & Quotation Hub
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=HOST=$HOST
Environment=PORT=$PORT
Environment=NODE_ENV=production
# 可选：RedFox Key
# Environment=REDFOX_KEY=你的key
ExecStart=$NODE_BIN tools/server.js
Restart=always
RestartSec=3
StandardOutput=append:$APP_DIR/logs/xiaoman.log
StandardError=append:$APP_DIR/logs/xiaoman.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1 || true
systemctl restart "$SERVICE"
sleep 2

# ---------- 4. 自检 ----------
if curl -fsS --max-time 5 "http://127.0.0.1:$PORT/index.html" >/dev/null; then
  say "服务已启动，本机自检通过"
else
  warn "本机自检失败，查看日志：journalctl -u $SERVICE -n 50 --no-pager  或  tail -n 50 $APP_DIR/logs/xiaoman.log"
  systemctl status "$SERVICE" --no-pager | head -20 || true
  exit 1
fi

# ---------- 5. 防火墙提示 ----------
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$PORT"/tcp >/dev/null 2>&1 && say "已放行 ufw $PORT/tcp" || warn "ufw 放行失败，请手动 ufw allow $PORT/tcp"
fi
if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --add-port="$PORT"/tcp --permanent >/dev/null 2>&1 && firewall-cmd --reload >/dev/null 2>&1 \
    && say "已放行 firewalld $PORT/tcp" || warn "firewalld 放行失败，请手动放行 $PORT/tcp"
fi

IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo '服务器IP')"
cat <<EOF

$(printf '\033[1;32m部署完成\033[0m')
  访问地址： http://$IP:$PORT/index.html
  员工访问码：XM2026   老板码：XMBOSS
  服务管理： systemctl status|restart|stop $SERVICE
  日志：     tail -f $APP_DIR/logs/xiaoman.log
  数据：     $APP_DIR/data/store.json（备份这个文件即可）

还记得在云厂商控制台「安全组」入方向放行 TCP $PORT，否则外网打不开。
EOF
