$ErrorActionPreference = "Stop"
Write-Host "Starting Word COM Object..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

$path = Resolve-Path "template.docx"
$doc = $word.Documents.Open($path.Path)

# 1. Delete all old placeholder texts
$find = $word.Selection.Find
$find.Execute("\[ 🚨 INSERT FRESH SCREENSHOT HERE 🚨 \]", $false, $false, $true, $false, $false, $true, 1, $false, "", 2) | Out-Null
$find.Execute("\[ ?🚨 INSERT FRESH SCREENSHOT HERE 🚨 ?\]", $false, $false, $true, $false, $false, $true, 1, $false, "", 2) | Out-Null

$word.Selection.HomeKey(6) | Out-Null

# Replace using string literals (wildcards $false)
$find = $word.Selection.Find
$find.ClearFormatting()
$find.Text = "[ 🚨 INSERT FRESH SCREENSHOT HERE 🚨 ]"
$find.Replacement.Text = ""
$find.Execute($find.Text, $false, $false, $false, $false, $false, $true, 1, $false, "", 2) | Out-Null

# KPI Blocks at TOP
$word.Selection.HomeKey(6) | Out-Null
$word.Selection.MoveDown(4, 3) | Out-Null # wdParagraph. Move down a couple of paragraphs past the header
$word.Selection.TypeParagraph()
$word.Selection.Font.Bold = $true
$word.Selection.Font.Size = 16
$word.Selection.TypeText("--- KPI SUMMARY ---")
$word.Selection.TypeParagraph()
$word.Selection.Font.Bold = $false
$word.Selection.Font.Size = 12
$word.Selection.TypeText("Total Users: {totalUsers}")
$word.Selection.TypeParagraph()
$word.Selection.TypeText("MFA Coverage: {mfaCoverage}")
$word.Selection.TypeParagraph()
$word.Selection.TypeText("Secure Score: {scorePct}%")
$word.Selection.TypeParagraph()
$word.Selection.TypeText("Total Devices: {totalDevices}")
$word.Selection.TypeParagraph()
$word.Selection.Font.Bold = $true
$word.Selection.Font.Size = 16
$word.Selection.TypeText("-------------------")
$word.Selection.TypeParagraph()
$word.Selection.Font.Bold = $false
$word.Selection.Font.Size = 11

function Insert-Chart-Tag {
    param([string]$SearchText, [string]$ChartTag)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($SearchText)) {
        $word.Selection.MoveRight(1, 1) | Out-Null
        $word.Selection.EndOf(4) | Out-Null # End of Paragraph
        $word.Selection.MoveRight(1, 1) | Out-Null
        $word.Selection.TypeParagraph()
        $word.Selection.TypeText($ChartTag)
        Write-Host "Inserted $ChartTag near $SearchText"
    }
}

# Insert specific charts
Insert-Chart-Tag "Active/Licensed Users:{activeUsers}" "{%mfaChart}"
Insert-Chart-Tag "Android: {devAndroid}" "{%deviceChart}"
Insert-Chart-Tag "Secure Score of {scorePct}%" "{%scoreChart}"

# License Chart after Table 1
$word.Selection.HomeKey(6) | Out-Null
$table1 = $doc.Tables.Item(1)
$table1.Range.Select()
$word.Selection.MoveDown(5, 1) | Out-Null # wdLine
$word.Selection.TypeParagraph()
$word.Selection.Font.Size = 11
$word.Selection.TypeText("{%licenseChart}")
Write-Host "Inserted {%licenseChart}"

Write-Host "Saving Document..."
$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Docxtemplater Image Tags injected!"
