let serverLocations = [], serverPlayers = [], serverGroups = [], serverRails = [], onlinePlayers = [];

// NEW DEPLOYMENT LINK HERE
const DB_URL = "https://script.google.com/macros/s/AKfycbz70CstbzO0nE_Ae-aYo37zuTcma-PEQFSyjS7UvsD0ybfBcrdWjnmi8DSvF-qyyBof/exec?type=all";

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

async function loadAllData() {
    try {
        const [dbRes] = await Promise.all([
            fetch(DB_URL).then(res => res.json()),
            fetchOnlinePlayers()
        ]);
        
        serverLocations = dbRes.locations || [];
        serverPlayers = dbRes.players || [];
        serverGroups = dbRes.groups || [];
        serverRails = dbRes.rails || [];

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

document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search-container')) {
        const searchRes = document.getElementById('searchResults');
        if(searchRes) searchRes.style.display = 'none';
    }
});

loadAllData();