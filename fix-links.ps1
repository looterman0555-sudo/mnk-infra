$f = Join-Path $PSScriptRoot "index.html"
$enc = New-Object System.Text.UTF8Encoding($false)
$c = [System.IO.File]::ReadAllText($f, $enc)
$q = [char]39

$map = [ordered]@{
  "commercial.jpg"        = "services.html#buildings"
  "residential.jpg"       = "services.html#buildings"
  "specialty-civil.jpg"   = "services.html#specialty"
  "road-construction.jpg" = "services.html#infrastructure"
  "earthwork.jpg"         = "services.html#infrastructure"
  "waterproofing.jpg"     = "services.html#specialty"
  "industrial.jpg"        = "services.html#buildings"
  "multistory.jpg"        = "services.html#buildings"
  "preengineered.jpg"     = "services.html#buildings"
  "concrete-tank.jpg"     = "services.html#specialty"
  "mep.jpg"               = "services.html#specialty"
  "cable-laying.jpg"      = "services.html#infrastructure"
  "walkways-bridges.jpg"  = "services.html#infrastructure"
}

foreach ($k in $map.Keys) {
  $old = '<a class="e-card" href="#contact" style="background-image:url(''images/' + $k + $q + ')">'
  $new = '<a class="e-card" href="' + $map[$k] + '" style="background-image:url(''images/' + $k + $q + ')">'
  $c = $c.Replace($old, $new)
}

# purpose cards -> dedicated pages
$c = $c.Replace('<a class="n-card reveal" href="#about">', '<a class="n-card reveal" href="vision.html">')

$nl = [char]13 + [char]10
$safetyOld = 'href="vision.html">' + $nl + '            <div class="n-card__frame"><img data-imgparallax src="images/safety.jpg"'
$safetyNew = 'href="safety.html">' + $nl + '            <div class="n-card__frame"><img data-imgparallax src="images/safety.jpg"'
$c = $c.Replace($safetyOld, $safetyNew)

# CTA learn-more
$c = $c.Replace('<a href="#expertise">Our Services</a>', '<a href="services.html">Our Services</a>')
$c = $c.Replace('<a href="#projects">Projects</a>', '<a href="projects.html">Projects</a>')

# every remaining #contact -> contact page
$c = $c.Replace('href="#contact"', 'href="contact.html"')

[System.IO.File]::WriteAllText($f, $c, $enc)
Select-String -Path $f -Pattern 'href="#' | ForEach-Object { $_.LineNumber.ToString() + ": " + $_.Line.Trim() }
