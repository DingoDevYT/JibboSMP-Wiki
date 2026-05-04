let serverLocations = [];

// A vanilla JavaScript function to parse simple CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    // Skip the header row (index 0) and start at index 1
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; 

        // Split by comma, but this basic regex ignores commas inside quotes
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        
        if (values.length >= 7) {
            result.push({
                id: values[0].replace(/"/g, ''),
                name: values[1].replace(/"/g, ''),
                x: parseInt(values[2]),
                y: parseInt(values[3]),
                z: parseInt(values[4]),
                image: values[5].replace(/"/g, ''),
                description: values[6].replace(/"/g, '')
            });
        }
    }
    return result;
}

// Fetch the CSV file and load it into the array
async function loadLocations() {
    try {
        const response = await fetch('Jibbo MC Server - Locations - Sheet1.csv');
        const csvData = await response.text();
        serverLocations = parseCSV(csvData);
        
        // If the page has a render function (like Atlas does), call it after loading
        if (typeof renderLocations === 'function') {
            renderLocations();
        }
    } catch (error) {
        console.error('Error loading the CSV file:', error);
    }
}

// Start the loading process immediately
loadLocations();