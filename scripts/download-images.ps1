$mapping = Get-Content "scripts/mapping.json" -Raw | ConvertFrom-Json
$baseUrl = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
$targetDir = "public/exercises"
$success = 0
$failed = 0

foreach ($m in $mapping) {
  $dir = Join-Path $targetDir $m.Id
  New-Item -ItemType Directory -Path $dir -Force | Out-Null

  $images = @($m.Image0, $m.Image1) | Where-Object { $_ -ne "" -and $_ -ne $null }
  foreach ($img in $images) {
    $url = "$baseUrl/$img"
    $filename = Split-Path $img -Leaf
    $outFile = Join-Path $dir $filename
    
    if (Test-Path $outFile) {
      Write-Host "EXISTS: $outFile"
      $success++
      continue
    }

    try {
      Invoke-WebRequest -Uri $url -OutFile $outFile -ErrorAction Stop
      Write-Host "OK: $($m.Id) -> $filename"
      $success++
    } catch {
      Write-Host "FAIL: $($m.Id) -> $url ($($_.Exception.Message))"
      $failed++
    }
  }
}

Write-Host "`nDone: $success OK, $failed failed"
