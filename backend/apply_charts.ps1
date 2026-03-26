$ErrorActionPreference = "Stop"
Write-Host "Starting Word COM Object..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

$path = Resolve-Path "template.docx"
$doc = $word.Documents.Open($path.Path)

# 1. Insert specific charts (No KPI headers, untouched text)
$word.Selection.HomeKey(6) | Out-Null
$table1 = $doc.Tables.Item(1)
$table1.Range.Select()
$word.Selection.MoveDown(5, 1) | Out-Null # wdLine
$word.Selection.TypeParagraph()
$word.Selection.TypeText("{%licenseChart}")
Write-Host "Inserted {%licenseChart}"

function Insert-Chart-Tag {
    param([string]$SearchText, [string]$ChartTag)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($SearchText)) {
        $word.Selection.MoveRight(1, 1) | Out-Null
        $word.Selection.EndOf(4) | Out-Null # wdParagraph
        $word.Selection.MoveRight(1, 1) | Out-Null
        $word.Selection.TypeParagraph()
        $word.Selection.TypeText($ChartTag)
        Write-Host "Inserted $ChartTag near $SearchText"
    }
}

Insert-Chart-Tag "Active/Licensed Users:{activeUsers}" "{%mfaChart}"
Insert-Chart-Tag "Android: {devAndroid}" "{%deviceChart}"
Insert-Chart-Tag "Secure Score of {scorePct}%" "{%scoreChart}"

# 2. Safely delete the old screenshots (Large images only to preserve Logos)
$count = $doc.InlineShapes.Count
$deleted = 0
for ($i = $count; $i -ge 1; $i--) {
    $shape = $doc.InlineShapes.Item($i)
    if ($shape.Type -eq 3) { # Picture
        # Usually screenshots are quite wide/tall (at least 200px), logos are smaller
        if ($shape.Width -gt 250 -or $shape.Height -gt 250) {
            $shape.Delete()
            $deleted++
        }
    }
}
Write-Host "Deleted $deleted large screenshots safely."

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Template updated perfectly!"
