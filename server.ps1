$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8088/")
$listener.Start()

$version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "c:\Users\asd\Documents\cordisoxcaml\Tradis"
$watcher.Filter = "index.html"
$watcher.EnableRaisingEvents = $true

Register-ObjectEvent $watcher "Changed" -Action {
    $global:version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | Out-Null

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $path = $req.Url.AbsolutePath
        $res.AddHeader("Access-Control-Allow-Origin", "*")

        if ($path -eq "/_cordis_version") {
            $currV = if ($global:version) { $global:version } else { $version }
            $body = "{`"version`": $currV}"
            $buf = [System.Text.Encoding]::UTF8.GetBytes($body)
            $res.ContentType = "application/json"
            $res.ContentLength64 = $buf.Length
            $res.OutputStream.Write($buf, 0, $buf.Length)
            $res.Close()
        } else {
            $filePath = "c:\Users\asd\Documents\cordisoxcaml\Tradis\index.html"
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = "text/html; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
        }
    } catch {
        # ignore client disconnects
    }
}