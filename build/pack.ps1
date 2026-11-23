$ErrorActionPreference = 'Stop'
$src   = 'E:\湖北\tongzhuang'
$out   = 'E:\湖北'
$stamp = Get-Date -Format 'yyyyMMdd'
$tmp   = Join-Path $env:TEMP ('gypack_' + $stamp)
$full  = Join-Path $tmp 'full'
$lite  = Join-Path $tmp 'lite'

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Force $full, $lite | Out-Null

# ---------- 完整版 ----------
robocopy $src $full /E /NFL /NDL /NJH /NJS /XD "$src\build\scrape" "$src\.git" /XF "_*" "*.zip" "*.log" | Out-Null
Copy-Item (Join-Path $src 'docs\使用说明.md') (Join-Path $full '使用说明.md') -Force

# ---------- 轻量版（去掉首屏视频） ----------
robocopy $full $lite /E /NFL /NDL /NJH /NJS /XD (Join-Path $full 'assets\video') | Out-Null

$lines = @(
  '小满童装 · 选款与报价中台',
  ('打包日期：' + (Get-Date -Format 'yyyy-MM-dd HH:mm')),
  '',
  '【怎么用】',
  '1. 解压到任意目录（路径带中文没问题）',
  '2. 双击「启动.bat」，浏览器会自动打开 http://127.0.0.1:8765/index.html',
  '3. 用完双击「停止.bat」关掉后台服务',
  '',
  '【四个入口】',
  '· 客户：任意联系方式登录（WhatsApp / 手机 / 邮箱 / 微信）',
  '· 体验版·客户 / 体验版·员工 / 体验版·老板：点闪电按钮，什么都不用填（员工与老板为只读）',
  '· 员工访问码：XM2026    老板访问码：XMBOSS',
  '  要改的话，编辑 assets\auth.js 顶部的 STAFF_CODE / BOSS_CODE',
  '',
  '【内容清单】',
  '· index.html + assets\   界面、数据、10 种语言、272 个型号图片',
  '· data\                  内置数据库（SQLite / Excel / Word 原稿）',
  '· docs\                  使用说明、配套文档、界面截图',
  '· build\                 数据构建脚本（改数据时才用）',
  '· tools\server.js        本地静态服务 + 短视频接口中转（启动.bat 会调用）',
  '',
  '【注意】',
  '· 所有数据存在浏览器 localStorage，换电脑或换浏览器就是从零开始',
  '· 短视频接口要真实 Key 才能调 RedFox（按次计费），不填也能看界面',
  '· 首屏视频在 assets\video（约 80MB），轻量版已移除；没有视频会自动用图片轮播',
  ''
)
$readme = $lines -join "`r`n"
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $full '快速开始.txt'), $readme, $enc)
[System.IO.File]::WriteAllText((Join-Path $lite '快速开始.txt'), $readme, $enc)

$zipFull = Join-Path $out ('小满童装中台_{0}_完整版.zip' -f $stamp)
$zipLite = Join-Path $out ('小满童装中台_{0}_轻量版.zip' -f $stamp)
Remove-Item $zipFull, $zipLite -Force -ErrorAction SilentlyContinue

Compress-Archive -Path (Join-Path $full '*') -DestinationPath $zipFull -CompressionLevel Optimal
Compress-Archive -Path (Join-Path $lite '*') -DestinationPath $zipLite -CompressionLevel Optimal

foreach ($z in @($zipFull, $zipLite)) {
  $f = Get-Item $z
  '{0}  {1:N1} MB' -f $f.Name, ($f.Length / 1MB)
}
