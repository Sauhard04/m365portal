$ErrorActionPreference = "Stop"
Write-Host "Creating pristine template..."
Copy-Item "../Incwert Report - May 2025.docx" -Destination "template.docx" -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open((Resolve-Path "template.docx").Path)

# HELPER: Completely wipe paragraph text and replace it with clean tags
function Replace-Line {
    param([string]$SearchText, [string]$NewText)
    $word.Selection.HomeKey(6) | Out-Null
    $f = $word.Selection.Find
    if ($f.Execute($SearchText)) {
        $word.Selection.Expand(4) | Out-Null # Expand to Paragraph
        $word.Selection.Text = $NewText + "`r"
        Write-Host "Replaced line containing: $SearchText"
    } else {
        Write-Host "WARNING: Could not find $SearchText"
    }
}

# 1. Clean Telemetry Replacements (to avoid 5217 merges)
Replace-Line "Total Users in the Tenant" "Total Users in the Tenant: {totalUsers}"
Replace-Line "Blocked/Unlicensed Users" "Blocked/Unlicensed Users: {disabledUsers}"
Replace-Line "Active/Licensed Users" "Active/Licensed Users: {activeUsers}"
Replace-Line "Secure Score of" "The Secure Score of {scorePct}% indicates that there is room for improvement in the organization's security posture. Here are some key recommendations for improving this score:"

# 2. Rebuild Tables cleanly to guarantee docxtemplater loops work properly

# TABLE 1: Licenses
$t1 = $doc.Tables.Item(1)
while ($t1.Rows.Count -gt 1) { $t1.Rows.Item($t1.Rows.Count).Delete() }
$row = $t1.Rows.Add()
$row.Cells.Item(1).Range.Text = "{#licenses}{name}"
$row.Cells.Item(2).Range.Text = "{total}"
$row.Cells.Item(3).Range.Text = "{assigned}"
$row.Cells.Item(4).Range.Text = "{available}{/licenses}"

# TABLE 2: Groups (Rebuild as proper static table mapping)
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

# 3. Clean up the manual screenshots and Inject Dynamic Canvas Charts
# Instead of deleting all shape pictures blindly, we delete large screenshots only.
$deletedImages = 0
for ($i = $doc.InlineShapes.Count; $i -ge 1; $i--) {
    $shape = $doc.InlineShapes.Item($i)
    if ($shape.Type -eq 3 -and ($shape.Width -gt 200 -or $shape.Height -gt 200)) {
        $shape.Delete()
        $deletedImages++
    }
}
Write-Host "Removed $deletedImages old screenshots"

# Inject Chart Tags below original Explanations
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
Insert-Tag-Behind "To learn more about the different types of groups" "{%licenseChart}"
Insert-Tag-Behind "Active/Licensed Users: {activeUsers}" "{%mfaChart}"
Insert-Tag-Behind "Devices managed by Platform" "{%deviceChart}"
Insert-Tag-Behind "room for improvement in the organization's security posture" "{%scoreChart}"

# 4. Wipe bad template text formats (Old Hyperlinks and Metadata stay, 
# but we just wrap {sharedMailboxes} carefully)
Replace-Line "Total shared mailboxes created" "Total shared mailboxes created in the tenant: {sharedMailboxes}"

$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Perfect base template rebuilt!"
