$ErrorActionPreference = "Stop"
Write-Host "Creating pristine template..."
Copy-Item "../Incwert Report - May 2025.docx" -Destination "template.docx" -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)

$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()

# 1. Clean Shape Images completely 
# Delete large screenshots, natively healing split words like y<image>our to your
for ($i = $doc.Shapes.Count; $i -ge 1; $i--) {
    $doc.Shapes.Item($i).Delete()
}
for ($i = $doc.InlineShapes.Count; $i -ge 1; $i--) {
    $s = $doc.InlineShapes.Item($i)
    if ($s.Type -eq 3 -and ($s.Width -gt 150 -or $s.Height -gt 150)) {
        $s.Delete()
    }
}
# Header Logos
foreach ($section in $doc.Sections) {
    foreach ($header in $section.Headers) {
        for ($i = $header.Shapes.Count; $i -ge 1; $i--) {
            $header.Shapes.Item($i).Delete()
        }
        for ($i = $header.InlineShapes.Count; $i -ge 1; $i--) {
            $header.InlineShapes.Item($i).Delete()
        }
    }
}

# 2. Trackers & Hyperlinks
foreach ($link in $doc.Hyperlinks) {
    if ($link.Address -match "migration%40incwert\.com") {
        $link.Address = $link.Address -replace "\?login_hint=migration%40incwert\.com.*", ""
    }
}

function Replace-Line {
    param([string]$Search, [string]$NewTxt)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($Search)) {
        $word.Selection.Expand(4) | Out-Null
        $word.Selection.Text = $NewTxt + "`r"
    }
}

# 3. Clean Headers & Branding
Replace-Line "OFFICE 365 SERVICE" "OFFICE 365 SERVICE STATUS REPORT`rTenant Name: {tenantName}`rReport Date: {reportDate}`r"

# 4. Clean Data Values
Replace-Line "Total Users in the Tenant:" "Total Users in the Tenant: {totalUsers}"
Replace-Line "Blocked/Unlicensed Users:" "Blocked/Unlicensed Users: {disabledUsers}"
Replace-Line "Active/Licensed Users:" "Active/Licensed Users: {activeUsers}`r{%mfaChart}"
Replace-Line "Total shared mailboxes created" "Total shared mailboxes created in the tenant: {sharedMailboxes}"

Replace-Line "Secure Score of" "The Secure Score of {scorePct} indicates that there is room for improvement in the organization's security posture.`r{%scoreChart}"

Replace-Line "Microsoft ticket raised:" "Microsoft ticket raised: {ticketCount} tickets raised to Microsoft"
Replace-Line "Note: 1.7 TB" "{odStorageTxt}"
Replace-Line "Note: 125 GB" "{spStorageTxt}"

Replace-Line "Windows: 30" ""
Replace-Line "MacOS:" ""
Replace-Line "IOS:" ""
Replace-Line "Android:" ""
Replace-Line "Devices managed by Platform" "Devices managed by Platform:`r- Windows: {devWindows}`r- MacOS: {devMacos}`r- iOS: {devIos}`r- Android: {devAndroid}`r{%deviceChart}"

# 5. Perfect Section Placeholders
Replace-Line "2.2 Compliance Score:" "2.2 Compliance Score:`rPaste original screenshot here`rCompliance Score API: {complianceScore}"
Replace-Line "Your organization's ‎Adoption Score‎" "Your organization's ‎Adoption Score‎ is the total of its people’s experiences and technology experiences scores, which are each comprised of several categories of data. Scores are not provided at the individual user level.`rPaste original screenshot here`rAdoption Score API: {adoptionScore}"

Replace-Line "2.4.1 Email Usage:" "2.4.1 Email Usage:`rPaste original screenshot here"
Replace-Line "2.4.2 Teams Usage:" "2.4.2 Teams Usage:`rPaste original screenshot here`rTeams Usage API: {teamsUsage}"
Replace-Line "2.4.3 OneDrive Usage:" "2.4.3 OneDrive Usage:`rPaste original screenshot here"
Replace-Line "2.4.4 SharePoint Usage:" "2.4.4 SharePoint Usage:`rPaste original screenshot here"

# 6. Tables Reset Cleanly
$t1 = $doc.Tables.Item(1)
while ($t1.Rows.Count -gt 1) { $t1.Rows.Item($t1.Rows.Count).Delete() }
$row = $t1.Rows.Add()
$row.Cells.Item(1).Range.Text = "{#licenses}{name}"
$row.Cells.Item(2).Range.Text = "{total}"
$row.Cells.Item(3).Range.Text = "{assigned}"
$row.Cells.Item(4).Range.Text = "{available}{/licenses}"

$word.Selection.HomeKey(6) | Out-Null
$t1.Range.Select()
$word.Selection.MoveDown(5, 1) | Out-Null
$word.Selection.TypeParagraph()
$word.Selection.TypeText("{%licenseChart}")

$t2 = $doc.Tables.Item(2)
while ($t2.Rows.Count -gt 1) { $t2.Rows.Item($t2.Rows.Count).Delete() }
$t2.Rows.Item(1).Cells.Item(1).Range.Text = "Group Level"
$t2.Rows.Item(1).Cells.Item(2).Range.Text = "Count"
function Add-Group-Row($type, $tag) {
    if ($t2.Columns.Count -lt 2) { $t2.Columns.Add() | Out-Null }
    $r = $t2.Rows.Add()
    $r.Cells.Item(1).Range.Text = $type
    $r.Cells.Item(2).Range.Text = $tag
}
Add-Group-Row "M365 Groups" "{m365Groups}"
Add-Group-Row "Distribution Lists" "{distLists}"
Add-Group-Row "Mail-Enabled Groups" "{mailEnabled}"
Add-Group-Row "Security Groups" "{secGroups}"

$t3 = $doc.Tables.Item(3)
while ($t3.Rows.Count -gt 1) { $t3.Rows.Item($t3.Rows.Count).Delete() }
$r3 = $t3.Rows.Add()
$r3.Cells.Item(1).Range.Text = "{#configPolicies}{name}"
$r3.Cells.Item(2).Range.Text = "{platform}"
$r3.Cells.Item(3).Range.Text = "{type}"
$r3.Cells.Item(4).Range.Text = "{status}{/configPolicies}"

$t4 = $doc.Tables.Item(4)
while ($t4.Rows.Count -gt 1) { $t4.Rows.Item($t4.Rows.Count).Delete() }
$r4 = $t4.Rows.Add()
$r4.Cells.Item(1).Range.Text = "{#compPolicies}{name}"
$r4.Cells.Item(2).Range.Text = "{platform}"
$r4.Cells.Item(3).Range.Text = "{status}"
$r4.Cells.Item(4).Range.Text = "{users}"
$r4.Cells.Item(5).Range.Text = "{remarks}{/compPolicies}"

# 7. Red Color Formatting for visual Placeholders
$word.Selection.HomeKey(6) | Out-Null
$f = $word.Selection.Find
$f.Text = "Paste original screenshot here"
while ($f.Execute()) {
    $word.Selection.Font.Color = 255 # wpColorRed
}

$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Ultimate format successfully compiled!"
