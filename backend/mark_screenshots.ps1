$ErrorActionPreference = "Stop"
Write-Host "Starting Word COM Object..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

$path = Resolve-Path "template.docx"
$doc = $word.Documents.Open($path.Path)

$count = $doc.InlineShapes.Count
Write-Host "Found $count inline shapes."

# Loop backwards when deleting to avoid index shifting
for ($i = $count; $i -ge 1; $i--) {
    $shape = $doc.InlineShapes.Item($i)
    if ($shape.Type -eq 3) { # 3 = wdInlineShapePicture
        $range = $shape.Range
        $shape.Delete()
        $range.Text = "[ 🚨 INSERT FRESH SCREENSHOT HERE 🚨 ]"
        $range.Font.Color = 255 # wdColorRed
        $range.Font.Bold = $true
        $range.Font.Size = 16
    }
}

Write-Host "Finished replacing images."
$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
