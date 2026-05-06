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

loadAllData();


// ==========================================
// 🎵 FRUTIGER AERO: BGM MEMORY ENGINE & VFX
// ==========================================
const bgm = new Audio('sounds/frutiger bg music.mp3');
bgm.loop = true;
bgm.volume = 0.4;

let savedState = localStorage.getItem('bgmPlaying');
let bgmPlaying = (savedState === null) ? true : (savedState === 'true');

const savedTime = localStorage.getItem('bgmTime');
if (savedTime && bgmPlaying) {
    bgm.currentTime = parseFloat(savedTime);
}

setInterval(() => {
    if (bgmPlaying && !bgm.paused) {
        localStorage.setItem('bgmTime', bgm.currentTime);
    }
}, 500);

const hoverSounds = ['sounds/select1.mp3', 'sounds/select2.mp3', 'sounds/select3.mp3'];
const clickSounds = ['sounds/button-press1.mp3', 'sounds/button-press2.mp3'];

function playSfx(soundArray) {
    const sfx = new Audio(soundArray[Math.floor(Math.random() * soundArray.length)]);
    sfx.volume = 0.5;
    sfx.play().catch(()=>{});
}

document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.dir-tab') || e.target.closest('.clickable-node') || e.target.closest('select') || e.target.closest('input')) {
        playSfx(hoverSounds);
    }
});

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.global-search-container')) {
        const searchRes = document.getElementById('searchResults');
        if(searchRes) searchRes.style.display = 'none';
    }

    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.dir-tab') || e.target.closest('.clickable-node') || e.target.closest('select') || e.target.closest('input')) {
        playSfx(clickSounds);
    }
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.origin === window.location.origin && link.target !== '_blank') {
        if (link.getAttribute('href').startsWith('javascript:')) return;
        if (link.pathname === window.location.pathname && link.hash) return;

        e.preventDefault(); 
        localStorage.setItem('bgmTime', bgm.currentTime);
        document.body.classList.add('page-exit'); 
        
        setTimeout(() => {
            window.location.href = link.href;
        }, 350); 
    }
});


// ==========================================
// 🐟 PROCEDURAL ENGINE: KELP, WATER & FISH
// ==========================================
let activeFishes = [];

function initFrutigerAero() {
    
    // 1. SVG Water Displacement Filter 
    const svgFilter = `
        <svg width="0" height="0" style="position: absolute; z-index: -999;">
            <filter id="water-warp">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="2" result="noise">
                    <animate attributeName="baseFrequency" values="0.01; 0.015; 0.01" dur="15s" repeatCount="indefinite"/>
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="25" xChannelSelector="R" yChannelSelector="B"/>
            </filter>
        </svg>
    `;
    document.body.insertAdjacentHTML('beforeend', svgFilter);

    // 2. The Atmosphere
    const rays = document.createElement('div'); rays.className = 'light-rays';
    const glare = document.createElement('div'); glare.className = 'water-glare';
    const caustics = document.createElement('div'); caustics.className = 'ocean-caustics';
    document.body.appendChild(rays);
    document.body.appendChild(glare);
    document.body.appendChild(caustics);

    // 3. Procedural Realistic Kelp Forest
    for(let i = 0; i < 40; i++) {
        let kelp = document.createElement('div');
        kelp.className = 'kelp-blade';
        
        let width = Math.random() * 15 + 10;
        let height = Math.random() * 25 + 10; 
        let left = Math.random() * 100;
        
        kelp.style.width = width + 'px';
        kelp.style.height = height + 'vh';
        kelp.style.left = left + 'vw';
        
        let blur = Math.random() > 0.6 ? (Math.random() * 3) + 'px' : '0px';
        kelp.style.filter = `blur(${blur})`;
        
        let dur = Math.random() * 4 + 3;
        let delay = Math.random() * 5;
        kelp.style.animation = `kelpSway ${dur}s ease-in-out infinite alternate`;
        kelp.style.animationDelay = `-${delay}s`;
        
        document.body.appendChild(kelp);
    }

    // 4. Glass Bubbles
    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'bubble-container';
    document.body.appendChild(bubbleContainer);
    for(let i = 0; i < 25; i++) {
        let bubble = document.createElement('div');
        bubble.className = 'aero-bubble';
        bubble.style.left = Math.random() * 100 + 'vw';
        bubble.style.animationDuration = (Math.random() * 12 + 8) + 's';
        bubble.style.animationDelay = `-${Math.random() * 10}s`;
        bubble.style.width = bubble.style.height = (Math.random() * 50 + 15) + 'px';
        bubbleContainer.appendChild(bubble);
    }

    // 5. Procedural Organic Fish Math Engine
    const fishAssets = [
        { src: 'assets/fish.webp', facesRight: false },
        { src: 'assets/fish2.png', facesRight: true },
        { src: 'assets/fish3.webp', facesRight: false },
        { src: 'assets/fish4.png', facesRight: true }
    ];
    
    for(let i = 0; i < 8; i++) {
        let fishData = fishAssets[Math.floor(Math.random() * fishAssets.length)];
        let fishEl = document.createElement('div');
        fishEl.className = 'aero-fish';
        fishEl.style.backgroundImage = `url('${fishData.src}')`;
        
        let size = Math.random() * 60 + 50; 
        fishEl.style.width = size + 'px';
        fishEl.style.height = size + 'px';
        document.body.appendChild(fishEl);

        let isRight = Math.random() > 0.5;
        
        // 🐛 FIX: Scatter them randomly across the screen upon loading, instead of forcing them off-screen!
        let startX = (Math.random() * (window.innerWidth + 600)) - 300; 
        
        let startY = (window.innerHeight * 0.15) + Math.random() * (window.innerHeight * 0.6);

        activeFishes.push({
            el: fishEl,
            x: startX,
            baseY: startY,
            isRight: isRight,
            facesRight: fishData.facesRight,
            speed: (Math.random() * 1.2 + 0.8) * (isRight ? 1 : -1),
            wobbleSpeed: Math.random() * 1.5 + 1.0, 
            wobbleAmp: Math.random() * 40 + 20,     
            noiseOffset: Math.random() * 1000       
        });
    }

    requestAnimationFrame(renderFishEcosystem);

    // 6. Music Widget Setup
    const musicBtn = document.createElement('div');
    musicBtn.className = 'music-widget';
    musicBtn.innerHTML = bgmPlaying ? '💿 BGM: ON' : '💿 BGM: OFF';
    document.body.appendChild(musicBtn);

    if (bgmPlaying) {
        bgm.play().catch(() => {
            document.body.addEventListener('click', function unlockAudio() {
                if (bgmPlaying) bgm.play();
                document.body.removeEventListener('click', unlockAudio);
            }, { once: true });
        });
    }

    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (bgmPlaying) {
            bgm.pause();
            bgmPlaying = false;
        } else {
            bgm.play().catch(()=>{});
            bgmPlaying = true;
        }
        musicBtn.innerHTML = bgmPlaying ? '💿 BGM: ON' : '💿 BGM: OFF';
        localStorage.setItem('bgmPlaying', bgmPlaying); 
    });
}

// ==========================================
// 🌊 THE PHYSICS LOOP 
// ==========================================
function renderFishEcosystem(timestamp) {
    let t = timestamp * 0.001; 

    activeFishes.forEach(f => {
        f.x += f.speed;
        
        let noiseY = Math.sin((t * f.wobbleSpeed) + f.noiseOffset) * f.wobbleAmp;
        let finalY = f.baseY + noiseY;

        let pitch = Math.cos((t * f.wobbleSpeed) + f.noiseOffset) * (f.wobbleAmp * 0.4);
        if (!f.isRight) pitch = -pitch; 

        let scaleX = f.isRight ? (f.facesRight ? 1 : -1) : (f.facesRight ? -1 : 1);

        f.el.style.transform = `translate(${f.x}px, ${finalY}px) scaleX(${scaleX}) rotate(${pitch}deg)`;

        // Only teleport them if they naturally reach the edge of the screen!
        if (f.speed > 0 && f.x > window.innerWidth + 300) {
            f.x = -300;
            f.baseY = (window.innerHeight * 0.15) + Math.random() * (window.innerHeight * 0.6);
            f.speed = (Math.random() * 1.2 + 0.8);
        } else if (f.speed < 0 && f.x < -300) {
            f.x = window.innerWidth + 300;
            f.baseY = (window.innerHeight * 0.15) + Math.random() * (window.innerHeight * 0.6);
            f.speed = -(Math.random() * 1.2 + 0.8);
        }
    });

    requestAnimationFrame(renderFishEcosystem);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFrutigerAero);
} else {
    initFrutigerAero();
}