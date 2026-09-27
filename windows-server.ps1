param(
    [ValidateRange(1, 65535)]
    [int]$Port = 4173,

    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ExitCode = 0
$Listener = $null
$AppRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$DirectorySeparator = [System.IO.Path]::DirectorySeparatorChar
$RootPrefix = $AppRoot.TrimEnd([char[]]@(47, 92)) + $DirectorySeparator
$AppUrl = "http://127.0.0.1:$Port/"

$ContentTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'text/javascript; charset=utf-8'
    '.mjs'   = 'text/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.txt'   = 'text/plain; charset=utf-8'
    '.png'   = 'image/png'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.webp'  = 'image/webp'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
}

function Write-HttpResponse {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Stream]$Stream,

        [Parameter(Mandatory = $true)]
        [int]$StatusCode,

        [Parameter(Mandatory = $true)]
        [string]$StatusText,

        [Parameter(Mandatory = $true)]
        [byte[]]$Body,

        [Parameter(Mandatory = $true)]
        [string]$ContentType,

        [bool]$HeadOnly = $false
    )

    $Headers = @(
        "HTTP/1.1 $StatusCode $StatusText"
        "Content-Type: $ContentType"
        "Content-Length: $($Body.Length)"
        'Cache-Control: no-cache'
        'X-Content-Type-Options: nosniff'
        'Connection: close'
        ''
        ''
    ) -join "`r`n"

    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Headers)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)

    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }

    $Stream.Flush()
}

function Write-TextResponse {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Stream]$Stream,

        [Parameter(Mandatory = $true)]
        [int]$StatusCode,

        [Parameter(Mandatory = $true)]
        [string]$StatusText,

        [Parameter(Mandatory = $true)]
        [string]$Message,

        [bool]$HeadOnly = $false
    )

    $Body = [System.Text.Encoding]::UTF8.GetBytes($Message)
    Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -StatusText $StatusText -Body $Body -ContentType 'text/plain; charset=utf-8' -HeadOnly $HeadOnly
}

function Resolve-RequestedFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RequestTarget
    )

    $QueryPosition = $RequestTarget.IndexOf('?')
    if ($QueryPosition -ge 0) {
        $RequestTarget = $RequestTarget.Substring(0, $QueryPosition)
    }

    $DecodedPath = [System.Uri]::UnescapeDataString($RequestTarget)
    $RelativePath = $DecodedPath.TrimStart([char[]]@(47, 92))
    $RelativePath = $RelativePath.Replace([char]47, $DirectorySeparator)

    if ([string]::IsNullOrWhiteSpace($RelativePath)) {
        $RelativePath = 'index.html'
    }

    $CandidatePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($AppRoot, $RelativePath))

    if (-not $CandidatePath.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw [System.UnauthorizedAccessException]::new('The requested path is outside the application directory.')
    }

    if ([System.IO.Directory]::Exists($CandidatePath)) {
        $CandidatePath = [System.IO.Path]::Combine($CandidatePath, 'index.html')
    }

    return $CandidatePath
}

function Handle-Client {
    param(
        [Parameter(Mandatory = $true)]
        [System.Net.Sockets.TcpClient]$Client
    )

    $Client.ReceiveTimeout = 5000
    $Client.SendTimeout = 5000
    $Stream = $Client.GetStream()
    $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)

    try {
        $RequestLine = $Reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($RequestLine)) {
            return
        }

        do {
            $HeaderLine = $Reader.ReadLine()
        } while ($null -ne $HeaderLine -and $HeaderLine.Length -gt 0)

        $RequestParts = $RequestLine.Split([char]' ')
        if ($RequestParts.Length -lt 3) {
            Write-TextResponse -Stream $Stream -StatusCode 400 -StatusText 'Bad Request' -Message 'Invalid HTTP request.'
            return
        }

        $Method = $RequestParts[0].ToUpperInvariant()
        $HeadOnly = $Method -eq 'HEAD'

        if ($Method -ne 'GET' -and -not $HeadOnly) {
            Write-TextResponse -Stream $Stream -StatusCode 405 -StatusText 'Method Not Allowed' -Message 'Only GET and HEAD requests are supported.'
            return
        }

        try {
            $FilePath = Resolve-RequestedFile -RequestTarget $RequestParts[1]
        }
        catch [System.UnauthorizedAccessException] {
            Write-TextResponse -Stream $Stream -StatusCode 403 -StatusText 'Forbidden' -Message 'Access denied.' -HeadOnly $HeadOnly
            return
        }
        catch {
            Write-TextResponse -Stream $Stream -StatusCode 400 -StatusText 'Bad Request' -Message 'Invalid path.' -HeadOnly $HeadOnly
            return
        }

        if (-not [System.IO.File]::Exists($FilePath)) {
            Write-TextResponse -Stream $Stream -StatusCode 404 -StatusText 'Not Found' -Message 'Resource not found.' -HeadOnly $HeadOnly
            return
        }

        $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
        $ContentType = 'application/octet-stream'
        if ($ContentTypes.ContainsKey($Extension)) {
            $ContentType = $ContentTypes[$Extension]
        }

        $Body = [System.IO.File]::ReadAllBytes($FilePath)
        Write-HttpResponse -Stream $Stream -StatusCode 200 -StatusText 'OK' -Body $Body -ContentType $ContentType -HeadOnly $HeadOnly
    }
    finally {
        $Reader.Dispose()
        $Stream.Dispose()
    }
}

try {
    $Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Server.ExclusiveAddressUse = $true
    $Listener.Start()

    Write-Host ''
    Write-Host 'MAPA 101 is running.' -ForegroundColor Green
    Write-Host "Address: $AppUrl"
    Write-Host 'Close this window or press Ctrl+C to stop the application.'
    Write-Host ''

    if (-not $NoBrowser) {
        try {
            Start-Process $AppUrl
        }
        catch {
            Write-Warning "The browser could not be opened automatically. Open this address manually: $AppUrl"
        }
    }

    while ($true) {
        if (-not $Listener.Pending()) {
            Start-Sleep -Milliseconds 50
            continue
        }

        $Client = $null
        try {
            $Client = $Listener.AcceptTcpClient()
            Handle-Client -Client $Client
        }
        catch {
            Write-Warning "Request error: $($_.Exception.Message)"
        }
        finally {
            if ($null -ne $Client) {
                $Client.Close()
            }
        }
    }
}
catch [System.Net.Sockets.SocketException] {
    Write-Host ''
    Write-Host "ERROR: The local server could not start on port $Port." -ForegroundColor Red
    Write-Host 'The port may already be used by another application.' -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)"
    $ExitCode = 1
}
catch {
    Write-Host ''
    Write-Host 'ERROR: The MAPA 101 server stopped unexpectedly.' -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)"
    $ExitCode = 1
}
finally {
    if ($null -ne $Listener) {
        $Listener.Stop()
    }
}

exit $ExitCode