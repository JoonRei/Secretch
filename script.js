// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBsU93C29qUZwHOZ-8locQCfDLIBKeaPFc",
    authDomain: "community-tree-ed4a0.firebaseapp.com",
    databaseURL: "https://community-tree-ed4a0-default-rtdb.firebaseio.com",
    projectId: "community-tree-ed4a0",
    storageBucket: "community-tree-ed4a0.firebasestorage.app",
    messagingSenderId: "742518246988",
    appId: "1:742518246988:web:e4dec646473a9a63022ee9"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const urlParams = new URLSearchParams(window.location.search);
const msgId = urlParams.get('id');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- ZEN CHIME ---
function playZenChime() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 1.2);
}

// --- ATMOSPHERIC PARTICLES ---
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');
let particles = [];
function initParticles() {
    pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight;
    for(let i=0; i<50; i++) particles.push({ x: Math.random()*pCanvas.width, y: Math.random()*pCanvas.height, size: Math.random()*1.5, speed: Math.random()*0.3+0.1, opacity: Math.random()*0.4 });
}
function drawParticles() {
    pCtx.clearRect(0,0,pCanvas.width, pCanvas.height);
    particles.forEach(p => {
        pCtx.globalAlpha = p.opacity; pCtx.fillStyle = 'white'; pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI*2); pCtx.fill();
        p.y -= p.speed; if(p.y < -10) p.y = pCanvas.height+10;
    });
    requestAnimationFrame(drawParticles);
}
initParticles(); drawParticles();

// --- GENERATE & STATUS ---
document.getElementById('gen-btn').addEventListener('click', () => {
    audioCtx.resume();
    const nameInput = document.getElementById('sender-name');
    const textInput = document.getElementById('greeting-text');
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    
    if (name && text) {
        const newRef = database.ref('secrets').push({ name, text, seen: false });
        const link = `${window.location.origin}${window.location.pathname}?id=${newRef.key}`;
        
        // Compact UI Tweak
        document.querySelector('.description').style.display = 'none';
        document.getElementById('link-url').innerText = link;
        document.getElementById('link-section').classList.remove('hidden');
        document.getElementById('gen-btn').innerText = "Secret Created";

        let chimePlayed = false;
        database.ref('secrets/' + newRef.key).on('value', (snap) => {
            const data = snap.val();
            const badge = document.getElementById('status-badge');
            const statusTxt = document.getElementById('status-text');

            if(data?.seen) {
                badge.className = 'badge-opened';
                statusTxt.innerText = "SEEN";
                if(!chimePlayed) { playZenChime(); chimePlayed = true; }
            } else {
                badge.className = 'badge-pending';
                statusTxt.innerText = "DELIVERED";
            }
        });

        nameInput.value = ''; textInput.value = '';
    }
});

document.getElementById('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('link-url').innerText);
    document.getElementById('copy-btn').innerText = "Copied";
    setTimeout(() => document.getElementById('copy-btn').innerText = "Copy", 2000);
});

// --- REVEAL LOGIC ---
if (msgId) {
    document.getElementById('creator-view').classList.add('hidden');
    document.getElementById('receiver-view').classList.remove('hidden');
    database.ref('secrets/' + msgId).once('value', (snap) => {
        const data = snap.val();
        if (data) {
            document.getElementById('display-from').innerText = `From ${data.name}`;
            document.getElementById('display-msg').innerText = `"${data.text}"`;
            initScratch(msgId);
        }
    });
}

function initScratch(id) {
    const canvas = document.getElementById('scratch-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let isDrawing = false;
    const scratch = (e) => {
        if (!isDrawing) return;
        const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 45, 0, Math.PI * 2); ctx.fill();
        database.ref('secrets/' + id).update({ seen: true });
    };
    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('touchstart', () => { isDrawing = true; audioCtx.resume(); });
    window.addEventListener('mouseup', () => isDrawing = false);
    window.addEventListener('touchend', () => isDrawing = false);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('touchmove', scratch);
}