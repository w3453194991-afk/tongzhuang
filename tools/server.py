# -*- coding: utf-8 -*-
"""本地静态服务（Python 备用）。python tools/server.py"""
import http.server, socketserver, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", 8765))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    os.chdir(ROOT)
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print("")
        print("  小满童装 · 选款与报价中台已启动")
        print("  浏览器打开： http://127.0.0.1:%d/index.html" % PORT)
        print("  关闭本窗口即停止服务。")
        print("")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass