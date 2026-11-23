# 打包上传用的压缩包（排除 .git / 验收临时目录）
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\..\dist" | Out-Null
$out = "$PSScriptRoot\..\dist\xiaoman-kids-$stamp.tar.gz"
tar --exclude=.git --exclude=dist --exclude=_shots --exclude=_edge --exclude=_edge2 --exclude=build/__pycache__ -czf $out -C "$PSScriptRoot\.." .
if ($LASTEXITCODE -ne 0) { Write-Error "打包失败"; exit 1 }
"已生成：$out  ({0:N1} MB)" -f ((Get-Item $out).Length / 1MB)
"上传： scp `"$out`" root@服务器IP:/opt/"
"解压： mkdir -p /opt/xiaoman && tar -xzf /opt/xiaoman-kids-*.tar.gz -C /opt/xiaoman"
