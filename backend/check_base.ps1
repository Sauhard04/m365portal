$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "../Incwert Report - May 2025.docx").Path)
$doc.Content.Text | Out-File -FilePath "base_text.txt" -Encoding utf8
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
