$root = $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)
$errors = @()
$checked = 0

$htmlFiles = Get-ChildItem -Path $root -Filter *.html

foreach ($file in $htmlFiles) {
  $text = [System.IO.File]::ReadAllText($file.FullName, $enc)
  $ids = @{}
  foreach ($m in [regex]::Matches($text, 'id="([^"]+)"')) { $ids[$m.Groups[1].Value] = $true }

  foreach ($m in [regex]::Matches($text, '(?:href|src)="([^"]+)"')) {
    $link = $m.Groups[1].Value
    if ($link -match '^(https?:|mailto:|tel:|data:|javascript:)') { continue }
    $checked++
    $parts = $link -split '#', 2
    $path = $parts[0]
    $frag = ""
    if ($parts.Count -gt 1) { $frag = $parts[1] }
    if ($path -eq "") {
      # same-page fragment
      if ($frag -ne "" -and -not $ids.ContainsKey($frag)) {
        $errors += "$($file.Name): missing in-page anchor #$frag"
      }
      continue
    }
    $path = ($path -split '\?')[0]
    $target = Join-Path $file.DirectoryName $path
    if (-not (Test-Path -LiteralPath $target)) {
      $errors += "$($file.Name): broken link -> $link"
      continue
    }
    if ($frag -ne "" -and $target -like "*.html") {
      $tText = [System.IO.File]::ReadAllText($target, $enc)
      if ($tText -notmatch ('id="' + [regex]::Escape($frag) + '"')) {
        $errors += "$($file.Name): missing anchor $link"
      }
    }
  }

  # CSS url() references inside inline styles of this html
  foreach ($m in [regex]::Matches($text, "url\('([^']+)'\)")) {
    $u = $m.Groups[1].Value
    if ($u -match '^(https?:|data:)') { continue }
    $checked++
    if (-not (Test-Path -LiteralPath (Join-Path $file.DirectoryName $u))) {
      $errors += "$($file.Name): missing image -> $u"
    }
  }
}

# CSS files
foreach ($css in Get-ChildItem -Path (Join-Path $root "css") -Filter *.css) {
  $text = [System.IO.File]::ReadAllText($css.FullName, $enc)
  foreach ($m in [regex]::Matches($text, 'url\("?([^")]+)"?\)')) {
    $u = $m.Groups[1].Value
    if ($u -match '^(https?:|data:|/|#)') { continue }
    $checked++
    $resolved = Join-Path $css.DirectoryName $u
    if (-not (Test-Path -LiteralPath $resolved)) { $errors += "$($css.Name): missing asset -> $u" }
  }
}

# JS references (main.js has none, but keep check simple)
Write-Output "Checked $checked local references across $($htmlFiles.Count) HTML files."
if ($errors.Count -eq 0) {
  Write-Output "ALL LINKS OK"
} else {
  Write-Output "ERRORS:"
  $errors | Sort-Object -Unique | ForEach-Object { Write-Output " - $_" }
}
