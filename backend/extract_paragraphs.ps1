$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$doc = $word.Documents.Open((Resolve-Path "../Incwert Report - May 2025.docx").Path)
foreach ($p in $doc.Paragraphs) {
    if ($p.Range.Text -match "(?i)Secure|Windows|iOS|Android|Guest") {
        Write-Host "PARAGRAPH:" $p.Range.Text
    }
}
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
