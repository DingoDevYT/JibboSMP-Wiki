let serverLocations = [], serverPlayers = [], serverGroups = [], serverRails = [], onlinePlayers = [];

const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSd_knG9JWDn5KdFZ98mLTYBSiUCXZSFxuT9-kqy7hAIfEXwy0Nb--B_AdTqoe1V3oyzK4JjL9UD5U3/pub?";
const URLS = {
    locations: BASE_URL + "gid=0&single=true&output=csv",
    players: BASE_URL + "gid=581054914&single=true&output=csv",
    groups: BASE_URL + "gid=332466894&single=true&output=csv",
    rails: BASE_URL + "gid=749376022&single=true&output=csv"
};

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

function resolveImage(imgUrl, name) {
    if (!imgUrl || imgUrl.trim() === "" || imgUrl.trim().toUpperCase() === "N/A") {
        const cleanName = encodeURIComponent((name || "Unknown").trim());
        return `https://minotar.net/helm/${cleanName}/256.png`;
    }
    return imgUrl.trim();
}

function autoLinkText(text) {
    if (!text) return "";
    
    const entities = [
        ...serverPlayers.map(p => ({ name: p.name.trim(), url: `player.html?id=${p.id}` })),
        ...serverGroups.map(g => ({ name: g.name.trim(), url: `group.html?id=${g.id}` }))
    ];
    
    entities.sort((a, b) => b.name.length - a.name.length);
    
    let linkedText = text;
    entities.forEach(entity => {
        if (!entity.name || entity.name.length < 3) return; 
        const safeName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${safeName})\\b(?![^<]*>|[^<>]*<\\/a>)`, 'gi');
        linkedText = linkedText.replace(regex, `<a href="${entity.url}" class="auto-link">$&</a>`);
    });
    
    return linkedText.replace(/\n/g, '<br><br>');
}

function parseCSV(csvText, type) {
    if (!csvText) return [];
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
    
    return result.slice(1).filter(v => v.some(val => typeof val === 'string' && val.trim().toLowerCase() === 'approved')).map(v => {
        try {
            if (type === 'locations') return { id: v[0], name: v[1], ownerPlayer: v[2], ownerGroup: v[3], buildDate: v[4], x: v[5], y: v[6], z: v[7], image: resolveImage(v[8], v[1]), description: v[9], type: 'location' };
            if (type === 'players') return { id: v[0], name: v[1], joinDate: v[2], group: v[3], image: resolveImage(v[4], v[1]), description: v[5], type: 'player' };
            if (type === 'groups') return { id: v[0], name: v[1], foundingDate: v[2], leader: v[3], image: resolveImage(v[4], v[1]), description: v[5], type: 'group' };
            if (type === 'rails') return { id: v[0], type: v[1] ? v[1].toLowerCase() : '', name: v[2], color: v[3], x: parseFloat(v[4]), z: parseFloat(v[5]), connections: v[6] ? v[6].split(',').map(s => s.trim()).filter(s => s) : [] };
        } catch (err) {
            return null;
        }
    }).filter(n => n !== null);
}

async function loadAllData() {
    try {
        const cacheBust = "&t=" + new Date().getTime();
        
        const results = await Promise.allSettled([
            fetch(URLS.locations + cacheBust).then(res => res.text()), 
            fetch(URLS.players + cacheBust).then(res => res.text()), 
            fetch(URLS.groups + cacheBust).then(res => res.text()),
            fetch(URLS.rails + cacheBust).then(res => res.text()),
            fetchOnlinePlayers()
        ]);
        
        serverLocations = results[0].status === 'fulfilled' ? parseCSV(results[0].value, 'locations') : [];
        serverPlayers = results[1].status === 'fulfilled' ? parseCSV(results[1].value, 'players') : [];
        serverGroups = results[2].status === 'fulfilled' ? parseCSV(results[2].value, 'groups') : [];
        serverRails = results[3].status === 'fulfilled' ? parseCSV(results[3].value, 'rails') : [];

    } catch (e) { 
        console.error("Critical Database Error:", e); 
    } finally {
        if (window.renderPage) window.renderPage();
        if (typeof populateDropdowns === 'function') populateDropdowns();
    }
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

function getShortestPath(startId, endId) {
    const nodes = {};
    serverRails.forEach(r => nodes[r.id] = { ...r, edges: {} });
    
    serverRails.forEach(r => {
        r.connections.forEach(targetId => {
            if(nodes[targetId]) {
                const dist = Math.hypot(nodes[targetId].x - r.x, nodes[targetId].z - r.z);
                nodes[r.id].edges[targetId] = dist;
                nodes[targetId].edges[r.id] = dist; 
            }
        });
    });

    const distances = {}, prev = {}, queue = new Set(Object.keys(nodes));
    for (let id in nodes) distances[id] = Infinity;
    distances[startId] = 0;

    while (queue.size > 0) {
        let curr = null;
        for (let id of queue) {
            if (curr === null || distances[id] < distances[curr]) curr = id;
        }
        if (distances[curr] === Infinity) break;
        if (curr === endId) {
            const path = [];
            let u = endId;
            while (u) { path.unshift(u); u = prev[u]; }
            return path;
        }
        queue.delete(curr);
        for (let neighbor in nodes[curr].edges) {
            let alt = distances[curr] + nodes[curr].edges[neighbor];
            if (alt < distances[neighbor]) {
                distances[neighbor] = alt;
                prev[neighbor] = curr;
            }
        }
    }
    return null; 
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search-container')) {
        const searchRes = document.getElementById('searchResults');
        if(searchRes) searchRes.style.display = 'none';
    }
});

loadAllData();