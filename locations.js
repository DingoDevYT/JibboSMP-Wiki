let serverLocations = [], serverPlayers = [], serverGroups = [], onlinePlayers = [];

const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd_knG9JWDn5KdFZ98mLTYBSiUCXZSFxuT9-kqy7hAIfEXwy0Nb--B_AdTqoe1V3oyzK4JjL9UD5U3/pub?";
const URLS = {
    locations: BASE_URL + "gid=0&single=true&output=csv",
    players: BASE_URL + "gid=581054914&single=true&output=csv",
    groups: BASE_URL + "gid=332466894&single=true&output=csv"
};

// Fetches the raw JSON from the Dynmap to see who is online
async function fetchOnlinePlayers() {
    try {
        const res = await fetch("https://dynmap-proxy.landonian2006.workers.dev/up/world/world/0");
        if (res.ok) {
            const data = await res.json();
            if (data && data.players) {
                onlinePlayers = data.players.map(p => p.name.toLowerCase());
            }
        }
    } catch (e) {
        console.warn("Could not fetch live players from dynmap.");
    }
}

// Upgraded, bulletproof image resolver
function resolveImage(imgUrl, name) {
    if (!imgUrl || imgUrl.trim() === "" || imgUrl.trim().toUpperCase() === "N/A") {
        // Encode the name to handle spaces, and request a high-res 256px image
        const cleanName = encodeURIComponent(name.trim());
        return `https://minotar.net/helm/${cleanName}/256.png`;
    }
    return imgUrl.trim();
}

// New Auto-Linking Engine
function autoLinkText(text) {
    if (!text) return "";
    
    // Combine players and groups into one searchable array
    const entities = [
        ...serverPlayers.map(p => ({ name: p.name.trim(), url: `player.html?id=${p.id}` })),
        ...serverGroups.map(g => ({ name: g.name.trim(), url: `group.html?id=${g.id}` }))
    ];
    
    // Sort by length descending so "The Miners" is linked before the word "The"
    entities.sort((a, b) => b.name.length - a.name.length);
    
    let linkedText = text;
    entities.forEach(entity => {
        if (!entity.name || entity.name.length < 3) return; // Ignore tiny names to prevent false positives
        
        // Escape regex special characters
        const safeName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Intelligent Regex: Matches the name perfectly, but ignores it if it's already inside an HTML tag
        const regex = new RegExp(`\\b(${safeName})\\b(?![^<]*>|[^<>]*<\\/a>)`, 'gi');
        
        linkedText = linkedText.replace(regex, `<a href="${entity.url}" class="auto-link">$&</a>`);
    });
    
    // Convert Google Sheets line breaks into proper HTML line breaks
    return linkedText.replace(/\n/g, '<br><br>');
}

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
        if (type === 'locations') return { id: v[0], name: v[1], ownerPlayer: v[2], ownerGroup: v[3], buildDate: v[4], x: v[5], y: v[6], z: v[7], image: resolveImage(v[8], v[1]), description: v[9], type: 'location' };
        if (type === 'players') return { id: v[0], name: v[1], joinDate: v[2], group: v[3], image: resolveImage(v[4], v[1]), description: v[5], type: 'player' };
        if (type === 'groups') return { id: v[0], name: v[1], foundingDate: v[2], leader: v[3], image: resolveImage(v[4], v[1]), description: v[5], type: 'group' };
    });
}

async function loadAllData() {
    try {
        const cacheBust = "&t=" + new Date().getTime();
        const [locRes, playRes, groupRes, _] = await Promise.all([
            fetch(URLS.locations + cacheBust), 
            fetch(URLS.players + cacheBust), 
            fetch(URLS.groups + cacheBust),
            fetchOnlinePlayers()
        ]);
        
        serverLocations = parseCSV(await locRes.text(), 'locations');
        serverPlayers = parseCSV(await playRes.text(), 'players');
        serverGroups = parseCSV(await groupRes.text(), 'groups');

        if (window.renderPage) window.renderPage();
        if (typeof populateDropdowns === 'function') populateDropdowns();
    } catch (e) { console.error("Database Error:", e); }
}

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
    if (!e.target.closest('.global-search-container')) {
        const searchRes = document.getElementById('searchResults');
        if(searchRes) searchRes.style.display = 'none';
    }
});

loadAllData();