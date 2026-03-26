$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$doc = $word.Documents.Open((Resolve-Path "../Incwert Report - May 2025.docx").Path)
$out = @()
foreach ($p in $doc.Paragraphs) {
    if ($p.Range.Text -match "(?i)10|13|29|14|52|45\.48|30|18|5|Guest|Secure|Windows|iOS|Android") {
        $out += "PARAGRAPH: " + $p.Range.Text.Trim()
    }
}
$out | Out-File -FilePath "phrases.txt" -Encoding utf8
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
