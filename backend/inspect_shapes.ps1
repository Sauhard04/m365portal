$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)

Write-Host "--- INLINE SHAPES ---"
for ($i=1; $i -le $doc.InlineShapes.Count; $i++) {
   $s = $doc.InlineShapes.Item($i)
   Write-Host "InlineShape $i: Type=$($s.Type) W=$($s.Width) H=$($s.Height)"
}

Write-Host "--- FLOATING SHAPES ---"
for ($i=1; $i -le $doc.Shapes.Count; $i++) {
   $s = $doc.Shapes.Item($i)
   Write-Host "Shape $i: Type=$($s.Type) W=$($s.Width) H=$($s.Height) Name=$($s.Name)"
}

$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
