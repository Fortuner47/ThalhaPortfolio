param([Parameter(Mandatory=$true)][string]$Name)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $img) { Write-Output "NO IMAGE ON CLIPBOARD"; exit 1 }
$out = Join-Path $PSScriptRoot $Name
$img.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Output "SAVED $out ($((Get-Item $out).Length) bytes)"
