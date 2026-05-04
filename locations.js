let serverLocations = [];
let serverPlayers = [];
let serverGroups = [];

const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd_knG9JWDn5KdFZ98mLTYBSiUCXZSFxuT9-kqy7hAIfEXwy0Nb--B_AdTqoe1V3oyzK4JjL9UD5U3/pub?";
const URLS = {
    locations: BASE_URL + "gid=0&single=true&output=csv", // Jibbo MC Server - Locations - Locations.csv
    players: BASE_URL + "gid=YOUR_PLAYER_GID&single=true&output=csv", // Jibbo MC Server - Locations - Players.csv
    groups: BASE_URL + "gid=YOUR_GROUP_GID&single=true&output=csv"  // Jibbo MC Server - Locations - Groups.csv
};

function parseCSV(csvText, type) {
    const result = [];
    let row = [];
    let col = '';
    let quote = false;

    for (let i = 0; i < csvText.length; i++) {
        let cc = csvText[i], nc = csvText[i+1];
        if (cc === '"' && quote && nc === '"') { col += cc; ++i; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { row.push(col.trim()); col = ''; continue; }
        if ((cc === '\n' || cc === '\r') && !quote) {
            row.push(col.trim());
            if (row.length > 1) result.push(row);
            row = []; col = '';
            if (cc === '\r' && nc === '\n') ++i;
            continue;
        }
        col += cc;
    }
    if (col || row.length > 0) { row.push(col.trim()); if (row.length > 1) result.push(row); }

    return result.slice(1).filter(v => v[v.length - 1].toLowerCase() === 'approved').map(v => {
        if (type === 'locations') return { id: v[0], name: v[1], ownerPlayer: v[2], ownerGroup: v[3], buildDate: v[4], x: v[5], y: v[6], z: v[7], image: v[8], description: v[9] };
        if (type === 'players') return { id: v[0], name: v[1], joinDate: v[2], group: v[3], image: v[4], description: v[5] };
        if (type === 'groups') return { id: v[0], name: v[1], foundingDate: v[2], leader: v[3], image: v[4], description: v[5] };
    });
}

async function loadAllData() {
    try {
        const cacheBust = "&t=" + new Date().getTime();
        const [locRes, playRes, groupRes] = await Promise.all([
            fetch(URLS.locations + cacheBust),
            fetch(URLS.players + cacheBust),
            fetch(URLS.groups + cacheBust)
        ]);

        serverLocations = parseCSV(await locRes.text(), 'locations');
        serverPlayers = parseCSV(await playRes.text(), 'players');
        serverGroups = parseCSV(await groupRes.text(), 'groups');

        // Refresh UI
        if (typeof renderLatestAdditions === 'function') renderLatestAdditions();
        if (typeof renderLocations === 'function') renderLocations();
        if (typeof renderLocationDetails === 'function') renderLocationDetails();
        if (typeof populateDropdowns === 'function') populateDropdowns();
        if (typeof checkEditMode === 'function') checkEditMode();
    } catch (e) { console.error("Database Error:", e); }
}

loadAllData();