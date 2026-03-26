$ErrorActionPreference = "Stop"
$word = New-Object -ComObject Word.Application
$doc = $word.Documents.Open((Resolve-Path "../Incwert Report - May 2025.docx").Path)
$out = @()
for ($i=1; $i -le $doc.Tables.Count; $i++) {
    $table = $doc.Tables.Item($i)
    $out += "--- TABLE $i ---"
    try {
        $out += "R1C1: " + $table.Cell(1,1).Range.Text
        $out += "R2C1: " + $table.Cell(2,1).Range.Text
    } catch {}
}
$out | Out-File -FilePath "table_list.txt" -Encoding utf8
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
