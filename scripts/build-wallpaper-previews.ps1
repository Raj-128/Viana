$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $workspace 'src/assets/images/wallpapers/optimized'
$outputDir = Join-Path $workspace 'src/assets/images/wallpapers/previews'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
foreach ($number in 1..6) {
    $source = [System.Drawing.Image]::FromFile((Join-Path $sourceDir "$number.jpg"))
    $ratio = [Math]::Min(1.0, 1000.0 / [Math]::Max($source.Width, $source.Height))
    $preview = [System.Drawing.Bitmap]::new([int]($source.Width * $ratio), [int]($source.Height * $ratio))
    $graphics = [System.Drawing.Graphics]::FromImage($preview)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, $preview.Width, $preview.Height)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font 'Arial', 20, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $light = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 255, 255, 255))
    $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(95, 20, 20, 20))
    for ($y = 45; $y -lt ($preview.Height + 100); $y += 135) {
        for ($x = -70; $x -lt ($preview.Width + 100); $x += 245) {
            $state = $graphics.Save()
            $graphics.TranslateTransform($x, $y)
            $graphics.RotateTransform(-28)
            $graphics.DrawString('STUDIO VIANA', $font, $shadow, 1, 1)
            $graphics.DrawString('STUDIO VIANA', $font, $light, 0, 0)
            $graphics.Restore($state)
        }
    }
    $preview.Save((Join-Path $outputDir "$number.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $font.Dispose(); $light.Dispose(); $shadow.Dispose(); $graphics.Dispose(); $preview.Dispose(); $source.Dispose()
}
