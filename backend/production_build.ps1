$ErrorActionPreference = "Stop"
Write-Host "Creating pristine template..."
Copy-Item "../Incwert Report - May 2025.docx" -Destination "template.docx" -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)

# 1. CRITICAL: Turn OFF Track Changes and Accept All 
$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()

# 2. Hyperlinks Cleanup
foreach ($link in $doc.Hyperlinks) {
    if ($link.Address -match "migration%40incwert\.com") {
        $link.Address = $link.Address -replace "\?login_hint=migration%40incwert\.com.*", ""
    }
}

# 3. Text Replacement Helpers
function Replace-Text {
    param([string]$Find, [string]$Replace)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    $f.Execute($Find, $false, $false, $false, $false, $false, $true, 1, $false, $Replace, 2) | Out-Null
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

function Insert-Tag-Behind {
    param([string]$Text, [string]$Tag)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($Text)) {
        $word.Selection.MoveRight(1,1)|Out-Null
        $word.Selection.EndOf(4)|Out-Null
        $word.Selection.MoveRight(1,1)|Out-Null
        $word.Selection.TypeParagraph()
        $word.Selection.TypeText($Tag)
    }
}

# 4. Remove Branding
Replace-Text "May-2025" "{reportDate}"
Replace-Text "Incwert Value Research" "{tenantName}"

# 5. Extract Hardcoded Telemetry Numbers
Replace-Line "Total Users in the Tenant" "Total Users in the Tenant: {totalUsers}"
Replace-Line "Blocked/Unlicensed Users" "Blocked/Unlicensed Users: {disabledUsers}"
Replace-Line "Active/Licensed Users" "Active/Licensed Users: {activeUsers}"
Replace-Line "Secure Score of" "The Secure Score of {scorePct}% indicates that there is room for improvement in the organization's security posture."
Replace-Line "Total shared mailboxes created" "Total shared mailboxes created in the tenant: {sharedMailboxes}"

Replace-Line "Note: 1.7 TB" "{odStorageTxt}"
Replace-Line "Note: 125 GB" "{spStorageTxt}"
Replace-Line "Microsoft ticket raised:" "Microsoft ticket raised: {ticketCount} tickets raised to Microsoft"

Replace-Line "MacOS:" "MacOS: {devMac}"
Replace-Line "IOS:" "IOS: {devIos}"
Replace-Line "Android:" "Android: {devAndroid}"
Replace-Line "Windows:" "Devices managed by Platform: Windows: {devWindows}"

# Inject Missing Metric Placeholders
# Ensure we map Adoption Score, Compliance Score, and Teams Usage metrics specifically below their explanation links
Insert-Tag-Behind "Learn more about improvement actions" "Compliance Score: {complianceScore}"
Insert-Tag-Behind "To improve the Adoption score please follow the link" "Adoption Score: {adoptionScore}"
Insert-Tag-Behind "usage of Teams" "Teams Usage: {teamsUsage}"

# 6. Rebuild Tables cleanly
# TABLE 1: Licenses
$t1 = $doc.Tables.Item(1)
while ($t1.Rows.Count -gt 1) { $t1.Rows.Item($t1.Rows.Count).Delete() }
$row = $t1.Rows.Add()
$row.Cells.Item(1).Range.Text = "{#licenses}{name}"
$row.Cells.Item(2).Range.Text = "{total}"
$row.Cells.Item(3).Range.Text = "{assigned}"
$row.Cells.Item(4).Range.Text = "{available}{/licenses}"

# TABLE 2: Groups 
$t2 = $doc.Tables.Item(2)
while ($t2.Rows.Count -gt 1) { $t2.Rows.Item($t2.Rows.Count).Delete() }
$t2.Rows.Item(1).Cells.Item(1).Range.Text = "Group Type"
$t2.Rows.Item(1).Cells.Item(2).Range.Text = "Total Count"
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

# TABLE 3: Configuration Policies Loop
$t3 = $doc.Tables.Item(3)
while ($t3.Rows.Count -gt 1) { $t3.Rows.Item($t3.Rows.Count).Delete() }
$r3 = $t3.Rows.Add()
$r3.Cells.Item(1).Range.Text = "{#configPolicies}{name}"
$r3.Cells.Item(2).Range.Text = "{platform}"
$r3.Cells.Item(3).Range.Text = "{type}"
$r3.Cells.Item(4).Range.Text = "{status}{/configPolicies}"

# TABLE 4: Compliance Policies Loop
$t4 = $doc.Tables.Item(4)
while ($t4.Rows.Count -gt 1) { $t4.Rows.Item($t4.Rows.Count).Delete() }
$r4 = $t4.Rows.Add()
$r4.Cells.Item(1).Range.Text = "{#compPolicies}{name}"
$r4.Cells.Item(2).Range.Text = "{platform}"
$r4.Cells.Item(3).Range.Text = "{status}"
$r4.Cells.Item(4).Range.Text = "{users}"
$r4.Cells.Item(5).Range.Text = "{remarks}{/compPolicies}"

# 7. Screenshots Handling
for ($i = $doc.InlineShapes.Count; $i -ge 1; $i--) {
    $shape = $doc.InlineShapes.Item($i)
    if ($shape.Type -eq 3 -and ($shape.Width -gt 250 -or $shape.Height -gt 150)) {
        $range = $shape.Range
        $shape.Delete()
        $range.Text = "Paste original screenshot here`r"
        $range.Font.Color = 255 # wDColorRed
    }
}

# 8. Inject dynamic Canvas Charts
function Swap-Placeholder-With-Chart {
    param([string]$ContextText, [string]$Tag)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($ContextText)) {
        $word.Selection.MoveDown(5, 1) | Out-Null # wdLine down
        $word.Selection.Find.Execute("Paste original screenshot here") | Out-Null
        $word.Selection.Text = $Tag + "`r"
        $word.Selection.Font.Color = 0 # Black
    }
}

$word.Selection.HomeKey(6) | Out-Null
$table1 = $doc.Tables.Item(1)
$table1.Range.Select()
$word.Selection.MoveDown(5, 1) | Out-Null
$word.Selection.TypeParagraph()
$word.Selection.TypeText("{%licenseChart}")

Swap-Placeholder-With-Chart "Active/Licensed Users:" "{%mfaChart}"
Swap-Placeholder-With-Chart "Devices managed by Platform" "{%deviceChart}"
Swap-Placeholder-With-Chart "room for improvement in the organization's security posture" "{%scoreChart}"

# Disable track changes one final time
$doc.TrackRevisions = $false
$doc.Revisions.AcceptAll()

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Production template built!"
