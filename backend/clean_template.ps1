$ErrorActionPreference = "Stop"
Write-Host "Starting Word COM Object..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

$path = Resolve-Path "template.docx"
$doc = $word.Documents.Open($path.Path)

function Replace-Text {
    param([string]$FindText, [string]$ReplaceText)
    $find = $word.Selection.Find
    $find.Text = $FindText
    $find.Replacement.Text = $ReplaceText
    $find.Execute($FindText, $false, $false, $false, $false, $false, $true, 1, $false, $ReplaceText, 2) | Out-Null
    Write-Host "Replaced '$FindText'"
}

$word.Selection.HomeKey(6) | Out-Null
# Replace hardcoded dates and old company name
Replace-Text "May-2025" "{reportDate}"
Replace-Text "Total Created in May" "Total Groups"
Replace-Text "Incwert Value Research" "{tenantName}"

# Clean all hyperlinks that contain the old hardcoded login_hint email
Write-Host "Cleaning Hyperlinks..."
foreach ($link in $doc.Hyperlinks) {
    if ($link.Address -match "migration%40incwert\.com") {
        $link.Address = $link.Address -replace "\?login_hint=migration%40incwert\.com&source=applauncher", ""
        $link.Address = $link.Address -replace "\?login_hint=migration%40incwert\.com", ""
    }
}

Write-Host "Saving Document..."
$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Template sanitized successfully!"
