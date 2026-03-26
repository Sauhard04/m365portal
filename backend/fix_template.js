const fs = require('fs');
const AdmZip = require('adm-zip');

console.log("Loading original template to start fresh...");
// Let's start from the clean copied original
fs.copyFileSync('../Incwert Report - May 2025.docx', 'template.docx');

const zip = new AdmZip('template.docx');
let content = zip.readAsText('word/document.xml');

// Docxtemplater default tags use single braces: {tag}
const replacements = [
    { old: ">52<", new: ">{totalUsers}<" },
    { old: ">14<", new: ">{disabledUsers}<" },
    { old: ">29<", new: ">{activeUsers}<" },
    
    { old: ">10<", new: ">{m365Groups}<" },
    { old: ">2<", new: ">{distLists}<" },
    { old: ">13<", new: ">{secGroups}<" },
    
    { old: ">45.48<", new: ">{scorePct}<" },
    
    { old: ">30<", new: ">{devWindows}<" },
    { old: ">5<", new: ">{devIos}<" },
    { old: ">18<", new: ">{devAndroid}<" },

    { old: ">Microsoft 365 Business Basic<", new: ">{#licenses}{name}<" },
    { old: ">2<", new: ">{total}<" },
    { old: ">1<", new: ">{assigned}<" },
    { old: ">             1<", new: ">{available}{/licenses}<" },
];

console.log("Replacing hardcoded values with single-brace tags...");

for (const rep of replacements) {
    if (content.includes(rep.old)) {
        content = content.replace(rep.old, rep.new);
        console.log(`Successfully replaced: ${rep.old} -> ${rep.new}`);
    } else {
        console.warn(`Could not find exactly: ${rep.old}`);
    }
}

zip.updateFile('word/document.xml', Buffer.from(content, 'utf8'));
zip.writeZip('template.docx');

console.log("Fixed template.docx using single braces! Ready for rendering.");
