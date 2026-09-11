param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

if (-not $Root) {
    $Root = (Get-Location).Path
}

$mimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".htm"   = "text/html; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".gif"   = "image/gif"
    ".svg"   = "image/svg+xml"
    ".webp"  = "image/webp"
    ".ico"   = "image/x-icon"
    ".wav"   = "audio/wav"
    ".mp3"   = "audio/mpeg"
    ".ogg"   = "audio/ogg"
    ".mp4"   = "video/mp4"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

$started = $false
try {
    $listener.Start()
    $started = $true
} catch {
    # If initial port is taken, find next available port
    foreach ($altPort in (8081..8099)) {
        try {
            $listener = New-Object System.Net.HttpListener
            $listener.Prefixes.Add("http://localhost:$altPort/")
            $listener.Prefixes.Add("http://127.0.0.1:$altPort/")
            $listener.Start()
            $Port = $altPort
            $started = $true
            break
        } catch {
            continue
        }
    }
}

if (-not $started) {
    Write-Error "Failed to start HTTP listener."
    exit 1
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Wedding Invitation Server is Live!              " -ForegroundColor Cyan
Write-Host "  URL: http://localhost:$Port/                    " -ForegroundColor Yellow
Write-Host "  URL: http://127.0.0.1:$Port/                    " -ForegroundColor Yellow
Write-Host "  Serving from: $Root                             " -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop.                           " -ForegroundColor Magenta
Write-Host "  Live Edit: Auto-Reload ON (Changes sync live)   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green

try {
    Start-Process "http://localhost:$Port/"
} catch {}

function Process-Request($ctx, $dir, $types) {
    $req = $ctx.Request
    $res = $ctx.Response
    try {
        $rawPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

        # Handle Live-Reload polling endpoint
        if ($rawPath -eq "/__live_reload_status__") {
            $res.StatusCode = 200
            $res.ContentType = "application/json; charset=utf-8"
            $res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $res.Headers.Add("Access-Control-Allow-Origin", "*")

            $maxTicks = 0L
            $latestName = ""
            try {
                $watched = Get-ChildItem -Path $dir -Recurse -Include *.html,*.css,*.js,*.jpg,*.jpeg,*.png,*.svg,*.webp,*.mp3 -ErrorAction SilentlyContinue
                foreach ($item in $watched) {
                    $ticks = $item.LastWriteTimeUtc.Ticks
                    if ($ticks -gt $maxTicks) {
                        $maxTicks = $ticks
                        $latestName = $item.Name
                    }
                }
            } catch {}

            $json = '{"version":"' + $maxTicks + '","file":"' + $latestName + '"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.OutputStream.Close()
            return
        }

        if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "/index.html"
        }

        $relPath = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($dir, $relPath))

        if (-not $fullPath.StartsWith($dir, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($fullPath)) {
            $res.StatusCode = 404
            $res.ContentType = "text/plain; charset=utf-8"
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
            $res.OutputStream.Close()
            return
        }

        $extension = [System.IO.Path]::GetExtension($fullPath).ToLower()
        if ($types.ContainsKey($extension)) {
            $res.ContentType = $types[$extension]
        } else {
            $res.ContentType = "application/octet-stream"
        }

        $res.Headers.Add("Accept-Ranges", "bytes")
        $res.Headers.Add("Access-Control-Allow-Origin", "*")

        $fileInfo = New-Object System.IO.FileInfo($fullPath)
        $fileLen = $fileInfo.Length

        $range = $req.Headers["Range"]
        if ($range -and $range.StartsWith("bytes=")) {
            $rangeVal = $range.Substring(6).Split('-')
            $start = 0L
            $end = $fileLen - 1

            if (![string]::IsNullOrWhiteSpace($rangeVal[0])) {
                [long]::TryParse($rangeVal[0], [ref]$start) | Out-Null
            }
            if ($rangeVal.Length -gt 1 -and ![string]::IsNullOrWhiteSpace($rangeVal[1])) {
                [long]::TryParse($rangeVal[1], [ref]$end) | Out-Null
            }
            if ($end -ge $fileLen) {
                $end = $fileLen - 1
            }

            if ($start -gt $end -or $start -ge $fileLen) {
                $res.StatusCode = 416
                $res.Headers.Add("Content-Range", "bytes */$fileLen")
                $res.OutputStream.Close()
                return
            }

            $res.StatusCode = 206
            $chunkLen = $end - $start + 1
            $res.ContentLength64 = $chunkLen
            $res.Headers.Add("Content-Range", "bytes $start-$end/$fileLen")

            $fs = [System.IO.File]::OpenRead($fullPath)
            try {
                $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
                $buffer = New-Object byte[] 65536
                $rem = $chunkLen
                while ($rem -gt 0) {
                    $readLen = [Math]::Min($buffer.Length, $rem)
                    $bytesRead = $fs.Read($buffer, 0, $readLen)
                    if ($bytesRead -le 0) { break }
                    $res.OutputStream.Write($buffer, 0, $bytesRead)
                    $rem -= $bytesRead
                }
            } finally {
                $fs.Close()
            }
        } else {
            $res.StatusCode = 200
            $res.ContentLength64 = $fileLen
            $fs = [System.IO.File]::OpenRead($fullPath)
            try {
                $fs.CopyTo($res.OutputStream)
            } finally {
                $fs.Close()
            }
        }
        $res.OutputStream.Close()
    } catch {
        try { $ctx.Response.Abort() } catch {}
    }
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        Process-Request $context $Root $mimeTypes
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
