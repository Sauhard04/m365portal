$ErrorActionPreference = "Stop"
Write-Host "Copying original template..."
Copy-Item "../Incwert Report - May 2025.docx" -Destination "template.docx" -Force

Write-Host "Starting Word COM Object..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false

$path = Resolve-Path "template.docx"
$doc = $word.Documents.Open($path.Path)

function Replace-Text {
    param([string]$FindText, [string]$ReplaceText)
    $find = $word.Selection.Find
    $find.Text = $FindText
    $find.Replacement.Text = $ReplaceText
    $find.Execute($FindText, $false, $false, $false, $false, $false, $true, 1, $false, $ReplaceText, 2) | Out-Null
}

$word.Selection.HomeKey(6) | Out-Null # wdStory

# 1. Precise Replace for Users
Replace-Text "Total Users in the Tenant: 52" "Total Users in the Tenant: {totalUsers}"
Replace-Text "Blocked/Unlicensed Users:14" "Blocked/Unlicensed Users:{disabledUsers}"
Replace-Text "Active/Licensed Users:29" "Active/Licensed Users:{activeUsers}"

# 2. Precise safe replace for Groups
$word.Selection.HomeKey(6) | Out-Null
$find = $word.Selection.Find
if ($find.Execute("M 365 GROUP")) {
    $word.Selection.MoveDown(5, 1) | Out-Null
    $word.Selection.Expand(5) | Out-Null
    $word.Selection.Text = "{m365Groups}`r"
}
$word.Selection.HomeKey(6) | Out-Null
if ($find.Execute("DISTRIBUTION")) {
    $word.Selection.MoveDown(5, 1) | Out-Null
    $word.Selection.Expand(5) | Out-Null
    $word.Selection.Text = "{distLists}`r"
}
$word.Selection.HomeKey(6) | Out-Null
if ($find.Execute("MAIL-ENABLED")) {
    $word.Selection.MoveDown(5, 1) | Out-Null
    $word.Selection.Expand(5) | Out-Null
    $word.Selection.Text = "{mailEnabled}`r"
}
$word.Selection.HomeKey(6) | Out-Null
if ($find.Execute("SECURITY")) {
    $word.Selection.MoveDown(5, 1) | Out-Null
    $word.Selection.Expand(5) | Out-Null
    $word.Selection.Text = "{secGroups}`r"
}

# Shared Mailboxes
$word.Selection.HomeKey(6) | Out-Null
Replace-Text "Total shared mailboxes created in the tenant: 04" "Total shared mailboxes created in the tenant: {sharedMailboxes}"

# Tickets
$word.Selection.HomeKey(6) | Out-Null
Replace-Text "Microsoft ticket raised: 2 tickets raised to Microsoft" "Microsoft ticket raised: {ticketCount} tickets raised to Microsoft"

# Security Score and Devices
$word.Selection.HomeKey(6) | Out-Null
Replace-Text "Secure Score of 45.48%" "Secure Score of {scorePct}%"
Replace-Text "Windows: 30" "Windows: {devWindows}"
Replace-Text "MacOS: 0" "MacOS: {devMacos}"
Replace-Text "IOS: 5" "IOS: {devIos}"
Replace-Text "Android: 18" "Android: {devAndroid}"

# Storage
$word.Selection.HomeKey(6) | Out-Null
Replace-Text "Note: 1.7 TB total used of 1.9 TB." "{odStorageText}"
Replace-Text "Note: 125 GB total used out of 135 GB" "{spStorageText}"

# Table Functions
function Replace-In-Cell {
    param($Cell, [string]$FindText, [string]$ReplaceText)
    $f = $Cell.Range.Find
    $f.Execute($FindText, $false, $false, $false, $false, $false, $true, 0, $false, $ReplaceText, 2) | Out-Null
}

# License Table (Table 1)
$table1 = $doc.Tables.Item(1)
Replace-In-Cell $table1.Cell(2,1) "Microsoft 365 Business Basic" "{#licenses}{name}"
Replace-In-Cell $table1.Cell(2,2) "2" "{total}"
Replace-In-Cell $table1.Cell(2,3) "1" "{assigned}"
Replace-In-Cell $table1.Cell(2,4) "1" "{available}{/licenses}"

# Config Policies (Table 3)
$table3 = $doc.Tables.Item(3)
# To avoid multiple rows breaking the docxtemplater loop, we clear row 3+
while ($table3.Rows.Count -gt 2) {
    $table3.Rows.Item($table3.Rows.Count).Delete()
}
Replace-In-Cell $table3.Cell(2,1) "Android Device restriction" "{#configPolicies}{name}"
Replace-In-Cell $table3.Cell(2,2) "Android Enterprise" "{platform}"
Replace-In-Cell $table3.Cell(2,3) "Configuration settings" "{type}"
Replace-In-Cell $table3.Cell(2,4) "Successful" "{status}{/configPolicies}"

# Compliance Policies (Table 4)
$table4 = $doc.Tables.Item(4)
while ($table4.Rows.Count -gt 2) {
    $table4.Rows.Item($table4.Rows.Count).Delete()
}
Replace-In-Cell $table4.Cell(2,1) "Compliance Policy" "{#compPolicies}{name}"
Replace-In-Cell $table4.Cell(2,2) "Windows 10 and later" "{platform}"
Replace-In-Cell $table4.Cell(2,3) "Implemented" "{status}"
Replace-In-Cell $table4.Cell(2,4) "19" "{users}"
Replace-In-Cell $table4.Cell(2,5) "Successful" "{remarks}{/compPolicies}"

Write-Host "Saving Document..."
$doc.Save()
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "Template successfully accurately tagged with new telemetry!"
