let serverLocations = [];
let serverPlayers = [];
let serverGroups = [];

const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd_knG9JWDn5KdFZ98mLTYBSiUCXZSFxuT9-kqy7hAIfEXwy0Nb--B_AdTqoe1V3oyzK4JjL9UD5U3/pub?";
const URLS = {
    locations: BASE_URL + "gid=0&single=true&output=csv",
    players: BASE_URL + "gid=581054914&single=true&output=csv",
    groups: BASE_URL + "gid=332466894&single=true&output=csv"
};

function parseCSV(csvText, type) {
    const result = [];
    let row = [], col = '', quote = false;
    for (let i = 0; i < csvText.length; i++) {
        let cc = csvText[i], nc = csvText[i+1];
        if (cc === '"' && quote && nc === '"') { col += cc; ++i; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { row.push(col.trim()); col = ''; continue; }
        if ((cc === '\n' || cc === '\r') && !quote) {
            row.push(col.trim()); if (row.length > 1) result.push(row);
            row = []; col = ''; if (cc === '\r' && nc === '\n') ++i; continue;
        }
        col += cc;
    }
    if (col || row.length > 0) { row.push(col.trim()); if (row.length > 1) result.push(row); }
    return result.slice(1).filter(v => v[v.length - 1].toLowerCase() === 'approved').map(v => {
        if (type === 'locations') return { id: v[0], name: v[1], ownerPlayer: v[2], ownerGroup: v[3], buildDate: v[4], x: v[5], y: v[6], z: v[7], image: v[8], description: v[9], type: 'location' };
        if (type === 'players') return { id: v[0], name: v[1], joinDate: v[2], group: v[3], image: v[4], description: v[5], type: 'player' };
        if (type === 'groups') return { id: v[0], name: v[1], foundingDate: v[2], leader: v[3], image: v[4], description: v[5], type: 'group' };
    });
}

async function loadAllData() {
    try {
        const cacheBust = "&t=" + new Date().getTime();
        const [locRes, playRes, groupRes] = await Promise.all([
            fetch(URLS.locations + cacheBust), fetch(URLS.players + cacheBust), fetch(URLS.groups + cacheBust)
        ]);
        serverLocations = parseCSV(await locRes.text(), 'locations');
        serverPlayers = parseCSV(await playRes.text(), 'players');
        serverGroups = parseCSV(await groupRes.text(), 'groups');

        // Page-specific renders
        if (window.renderPage) window.renderPage();
        if (typeof populateDropdowns === 'function') populateDropdowns();
    } catch (e) { console.error("Database Error:", e); }
}

// Global Search Function
function globalSearch() {
    const query = document.getElementById('globalSearch').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (query.length < 2) { resultsDiv.style.display = 'none'; return; }

    const allData = [...serverLocations, ...serverPlayers, ...serverGroups];
    const filtered = allData.filter(item => item.name.toLowerCase().includes(query));

    resultsDiv.innerHTML = filtered.map(item => `
        <a href="${item.type}.html?id=${item.id}" class="search-res-item">
            <span class="search-res-type">${item.type}</span>
            <span>${item.name}</span>
        </a>
    `).join('');
    resultsDiv.style.display = filtered.length ? 'block' : 'none';
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search-container')) document.getElementById('searchResults').style.display = 'none';
});

loadAllData();