$ErrorActionPreference = "Stop"
Stop-Process -Name "WINWORD" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Creating pristine template..."
Copy-Item "../Incwert Report - May 2025.docx" -Destination "template.docx" -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)
$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()

# 1. Image Extermination
for ($i = $doc.Shapes.Count; $i -ge 1; $i--) {
    $doc.Shapes.Item($i).Delete()
}
for ($i = $doc.InlineShapes.Count; $i -ge 1; $i--) {
    $doc.InlineShapes.Item($i).Delete()
}

# 2. Text Targeter
function SwapTxt($o, $n) {
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    $f.Execute($o, $false, $false, $false, $false, $false, $true, 1, $false, $n, 2) | Out-Null
}

foreach ($link in $doc.Hyperlinks) {
    if ($link.Address -match "migration%40incwert\.com") {
        $link.Address = $link.Address -replace "\?login_hint=(.*?)(&source=applauncher)?", ""
    }
}

# 3. Overview Header & Layout Upgrades
SwapTxt "Incwert Value Research" ""
SwapTxt "May-2025" ""
SwapTxt "OFFICE 365 SERVICE STATUS REPORT" "OFFICE 365 SERVICE STATUS REPORT`r`rTenant Name: {tenantName}`rReport Date: {reportDate}`r`r--- KEY METRICS OVERVIEW ---`rTotal Users: {totalUsers}`rMFA Coverage: {mfaCoverage}`rSecure Score: {scorePct}`rTotal Devices: {totalDevices}`r----------------------------`r`r"

# 4. Standard Replaces
SwapTxt "Total Users in the Tenant: 52" "Total Users in the Tenant: {totalUsers}"
SwapTxt "Blocked/Unlicensed Users:14" "Blocked/Unlicensed Users: {disabledUsers}"
SwapTxt "Active/Licensed Users:29" "Active/Licensed Users: {activeUsers}`r`r{%mfaChart}"
SwapTxt "Total shared mailboxes created in the tenant:0" "Total shared mailboxes created in the tenant: {sharedMailboxes}"

SwapTxt "The Secure Score of 45.48% indicates" "The Secure Score of {scorePct} indicates"
SwapTxt "room for improvement in the organization's security posture." "room for improvement in the organization's security posture.`r`r{%scoreChart}"

SwapTxt "125 GB total used out of 135 GB" "{spStorageTxt}"
SwapTxt "1.7 TB total used of 1.9 TB." "{odStorageTxt}"
SwapTxt "Microsoft ticket raised: 11 tickets raised to Microsoft" "Microsoft ticket raised: {ticketCount} tickets raised to Microsoft"

# 5. Device Bullet Points
SwapTxt "Devices managed by Platform: Windows: 30   /" "Devices managed by Platform:`r• Windows: {devWindows}`r"
SwapTxt "MacOS: 0" "• MacOS: {devMacos}`r"
SwapTxt "IOS: 5" "• iOS: {devIos}`r"
SwapTxt "Android: 18" "• Android: {devAndroid}`r`r{%deviceChart}"

# 6. Formatted Link/Placeholder Separators
SwapTxt "2.2 Compliance Score:" "2.2 Compliance Score:`r[Paste original screenshot here]`rCompliance Score API: {complianceScore}"
SwapTxt "Scores are not provided at the individual user level./" "Scores are not provided at the individual user level.`r`r[Paste original screenshot here]`rAdoption Score API: {adoptionScore}`r"
SwapTxt "2.4.1 Email Usage:  " "2.4.1 Email Usage:`r[Paste original screenshot here]"
SwapTxt "2.4.2 Teams Usage:   " "2.4.2 Teams Usage:`r[Paste original screenshot here]`rTeams Usage API: {teamsUsage}"
SwapTxt "2.4.3 OneDrive Usage:" "2.4.3 OneDrive Usage:`r[Paste original screenshot here]"
SwapTxt "2.4.4 SharePoint Usage:    " "2.4.4 SharePoint Usage:`r[Paste original screenshot here]"

$word.Selection.HomeKey(6) | Out-Null
$f = $word.Selection.Find
while ($f.Execute("[Paste original screenshot here]")) {
    $word.Selection.Font.Color = 255
}

# 7. Tables 
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

$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()
$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Rebuild stable formatting v4 complete."
