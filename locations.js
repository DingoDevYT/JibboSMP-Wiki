let serverLocations = [];

const sheetCSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd_knG9JWDn5KdFZ98mLTYBSiUCXZSFxuT9-kqy7hAIfEXwy0Nb--B_AdTqoe1V3oyzK4JjL9UD5U3/pub?output=csv";

// Bulletproof CSV parser that handles internal commas and multiline descriptions
function parseCSV(csvText) {
    const result = [];
    let row = [];
    let col = '';
    let quote = false;

    for (let i = 0; i < csvText.length; i++) {
        let cc = csvText[i], nc = csvText[i+1];
        
        if (cc === '"' && quote && nc === '"') { col += cc; ++i; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { row.push(col.trim()); col = ''; continue; }
        
        // Handle line breaks properly outside of quotes
        if ((cc === '\n' || cc === '\r') && !quote) {
            row.push(col.trim());
            if (row.length > 1) result.push(row);
            row = []; col = '';
            if (cc === '\r' && nc === '\n') ++i; // Skip Windows line endings
            continue;
        }
        col += cc;
    }
    if (col || row.length > 0) {
        row.push(col.trim());
        if (row.length > 1) result.push(row);
    }

    const objects = [];
    // Skip the header row (index 0)
    for (let i = 1; i < result.length; i++) {
        const values = result[i];
        
        // Ensure we have all 11 columns from the new Google Sheet structure
        if (values.length >= 11) {
            const status = values[10].toLowerCase();
            
            if (status === 'approved') {
                objects.push({
                    id: values[0],
                    name: values[1],
                    ownerPlayer: values[2],
                    ownerGroup: values[3],
                    buildDate: values[4],
                    x: parseInt(values[5]),
                    y: parseInt(values[6]),
                    z: parseInt(values[7]),
                    image: values[8],
                    description: values[9]
                });
            }
        }
    }
    return objects;
}

async function loadLocations() {
    try {
        const response = await fetch(sheetCSV_URL + "&t=" + new Date().getTime());
        const csvData = await response.text();
        serverLocations = parseCSV(csvData);
        
        // Trigger page updates depending on what page the user is currently on
        if (typeof renderLocations === 'function') renderLocations();
        if (typeof renderLatestAdditions === 'function') renderLatestAdditions();
        if (typeof renderLocationDetails === 'function') renderLocationDetails();
        
    } catch (error) {
        console.error('Error loading the live database:', error);
    }
}

loadLocations();