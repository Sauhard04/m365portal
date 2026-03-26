$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)

Write-Host "InlineShapes:"
foreach ($s in $doc.InlineShapes) {
    Write-Host "W: $($s.Width) | H: $($s.Height)"
}
Write-Host "Shapes:"
foreach ($s in $doc.Shapes) {
    Write-Host "Name: $($s.Name) | W: $($s.Width) | H: $($s.Height)"
}

$doc.Close()
$word.Quit()
