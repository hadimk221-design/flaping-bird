const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to full screen (within container)
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game constants
const GRAVITY = 0.28; // 0.7x Speed
const FLAP = -4.9;    // 0.7x Speed
const SPAWN_RATE = 100; // 0.7x Speed
const PIPE_WIDTH = 70;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.1; // 0.7x Speed

// Game state
let frames = 0;
let score = 0;
let gameState = 'START';
let currentLevel = 6;
let birdColor = 'brown'; // Default

// UI Elements
const startScreen = document.getElementById('start-screen');
const shopScreen = document.getElementById('shop-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const finalScoreSpan = document.getElementById('final-score');
const homeBtn = document.getElementById('home-btn');
const playBtn = document.getElementById('play-btn');
const shopBtn = document.getElementById('shop-btn');
const exitBtn = document.getElementById('exit-btn');
const closeShopBtn = document.getElementById('close-shop-btn');

// --- GRAPHICS ENGINE ---
// Theme Definitions
const themes = {
    1: { // Jungle
        skyBot: "#4facfe", skyTop: "#00f2fe",
        mountains: "#2E7D32", trees: "#1B5E20", ground: "#3E2723", grass: "#43A047"
    },
    2: { // River
        skyBot: "#f83600", skyTop: "#fe8c00", // Sunset
        mountains: "#5D4037", trees: "#004D40", ground: "#0288D1", grass: "#81D4FA" // Water feeling
    },
    3: { // City
        skyBot: "#141E30", skyTop: "#243B55", // Night
        mountains: "#2c3e50", trees: "#34495e", ground: "#2c3e50", grass: "#95a5a6" // Asphalt/Concrete
    },
    4: { // Extreme (Volcano)
        skyBot: "#3E2723", skyTop: "#BF360C", // Red/Orange Ash
        mountains: "#212121", trees: "#4E342E", ground: "#263238", grass: "#D84315" // Dark rocks and lava
    },
    5: { // Pro (Space)
        skyBot: "#000000", skyTop: "#311B92", // Deep Space
        mountains: "#4527A0", trees: "#7B1FA2", ground: "#1A237E", grass: "#6200EA" // Neon/Alien
    },
    6: { // Ramadan (Event)
        skyBot: "#1a0b2e", skyTop: "#11052C", // Deep Night Purple
        mountains: "#cca43b", trees: "#f1c40f", ground: "#1a0b2e", grass: "#cca43b" // Gold/Sand
    }
};

// Background Layers (Parallax)
const layers = {
    sky: {
        draw: function () {
            let t = themes[currentLevel];
            let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grd.addColorStop(0, t.skyTop);
            grd.addColorStop(1, t.skyBot);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (currentLevel === 6) { // Ramadan Moon and Stars
                // Stars
                ctx.fillStyle = "#ffffff";
                for (let i = 0; i < 20; i++) {
                    let sx = (Math.sin(i * 132 + frames * 0.01) * 4321) % canvas.width;
                    let sy = (Math.cos(i * 45 + frames * 0.01) * 1234) % (canvas.height / 2);
                    if (sx < 0) sx += canvas.width;
                    if (sy < 0) sy += canvas.height / 2;

                    ctx.globalAlpha = Math.abs(Math.sin(frames * 0.05 + i));
                    ctx.fillRect(sx, sy, 2, 2);
                }
                ctx.globalAlpha = 1.0;

                // Crescent Moon
                ctx.save();
                ctx.translate(canvas.width - 80, 80);
                ctx.rotate(-0.2);
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(10, -5, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    },
    clouds: {
        x: 0,
        speed: 0.5,
        draw: function () {
            this.x -= this.speed;
            if (this.x <= -canvas.width) this.x = 0;

            ctx.fillStyle = (currentLevel === 3) ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.4)"; // Faint clouds at night
            for (let i = 0; i < 2; i++) {
                let offsetX = this.x + (i * canvas.width);
                ctx.beginPath();
                ctx.arc(offsetX + 100, 100, 50, 0, Math.PI * 2);
                ctx.arc(offsetX + 180, 80, 60, 0, Math.PI * 2);
                ctx.arc(offsetX + 260, 100, 50, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(offsetX + 500, 150, 70, 0, Math.PI * 2);
                ctx.arc(offsetX + 620, 120, 80, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    birds: {
        items: [],
        draw: function () {
            // Spawn logic
            if (Math.random() < 0.005) { // 0.5% chance per frame
                this.items.push({
                    x: canvas.width + 10,
                    y: Math.random() * (canvas.height / 3), // Top third
                    speed: 0.5 + Math.random() * 0.5,
                    size: 3 + Math.random() * 2,
                    wingOffset: Math.random() * 10
                });
            }

            // Draw & Update
            for (let i = 0; i < this.items.length; i++) {
                let b = this.items[i];
                b.x -= b.speed;

                // Remove if off screen
                if (b.x < -20) {
                    this.items.splice(i, 1);
                    i--;
                    continue;
                }

                // Draw V shape
                let flap = Math.sin((frames * 0.1 + b.wingOffset)) * (b.size / 2);
                ctx.beginPath();
                // Center
                ctx.moveTo(b.x, b.y);
                // Left wing tip
                ctx.lineTo(b.x - b.size, b.y - b.size + flap);
                // Center
                ctx.moveTo(b.x, b.y);
                // Right wing tip
                ctx.lineTo(b.x + b.size, b.y - b.size + flap);

                ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"; // Black silhouette
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    },
    mountains: {
        x: 0,
        speed: 1,
        draw: function () {
            this.x -= this.speed;
            if (this.x <= -canvas.width) this.x = 0;

            let t = themes[currentLevel];
            ctx.fillStyle = t.mountains;
            for (let i = 0; i < 2; i++) {
                let offsetX = this.x + (i * canvas.width);
                if (currentLevel === 3) {
                    // Cityscape
                    ctx.beginPath();
                    ctx.rect(offsetX, canvas.height - 300, 100, 300);
                    ctx.rect(offsetX + 120, canvas.height - 450, 80, 450);
                    ctx.rect(offsetX + 220, canvas.height - 250, 150, 250);
                    ctx.rect(offsetX + 400, canvas.height - 500, 120, 500);
                    ctx.rect(offsetX + 550, canvas.height - 350, 100, 350);
                    ctx.rect(offsetX + 700, canvas.height - 200, 200, 200);
                    ctx.fill();
                } else if (currentLevel === 6) {
                    // Mosques / Minarets
                    let spacing = 300;
                    for (let j = 0; j < 5; j++) {
                        let mx = offsetX + j * spacing;

                        ctx.fillStyle = "#15082bb0"; // Darker silhouette

                        // Minaret
                        ctx.fillRect(mx, canvas.height - 250, 20, 250);
                        // Dome
                        ctx.beginPath();
                        ctx.arc(mx + 80, canvas.height - 100, 40, Math.PI, 0);
                        ctx.fill();
                        ctx.fillRect(mx + 40, canvas.height - 100, 80, 100);

                        // Crescent on top
                        ctx.fillStyle = "#d4af37";
                        ctx.beginPath();
                        ctx.arc(mx + 80, canvas.height - 145, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // Natural Mountains/Hills
                    ctx.beginPath();
                    ctx.moveTo(offsetX, canvas.height);
                    ctx.lineTo(offsetX + 200, canvas.height - 300);
                    ctx.lineTo(offsetX + 500, canvas.height);
                    ctx.lineTo(offsetX + 800, canvas.height - 350);
                    ctx.lineTo(offsetX + canvas.width, canvas.height);
                    ctx.fill();
                }
            }
        }
    },
    trees: {
        x: 0,
        speed: 2,
        draw: function () {
            this.x -= this.speed;
            if (this.x <= -canvas.width) this.x = 0;

            let t = themes[currentLevel];
            ctx.fillStyle = t.trees;

            for (let i = 0; i < 2; i++) {
                let offsetX = this.x + (i * canvas.width);
                if (currentLevel === 3) {
                    // Streetlights / Low buildings
                    for (let j = 0; j < 5; j++) {
                        ctx.fillRect(offsetX + j * 250, canvas.height - 150, 10, 150); // Pole
                        ctx.beginPath();
                        ctx.arc(offsetX + j * 250 + 5, canvas.height - 160, 15, 0, Math.PI * 2); // Light
                        ctx.fill();
                    }
                } else if (currentLevel === 6) {
                    // Hanging Lanterns (Fanous)
                    for (let j = 0; j < 6; j++) {
                        let lx = offsetX + j * 180 + 50;
                        let ly = 100 + Math.sin(frames * 0.05 + j) * 10; // Bobbing

                        // String
                        ctx.strokeStyle = "#cca43b";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(lx, 0);
                        ctx.lineTo(lx, ly);
                        ctx.stroke();

                        // Lantern Body
                        ctx.fillStyle = "rgba(255, 215, 0, 0.6)"; // Glow
                        ctx.beginPath();
                        ctx.moveTo(lx - 10, ly);
                        ctx.lineTo(lx + 10, ly);
                        ctx.lineTo(lx + 15, ly + 20);
                        ctx.lineTo(lx, ly + 40);
                        ctx.lineTo(lx - 15, ly + 20);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();

                        // Light
                        ctx.fillStyle = "#fff";
                        ctx.beginPath();
                        ctx.arc(lx, ly + 20, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (currentLevel === 2) {
                    // Reeds for river
                    for (let j = 0; j < 15; j++) {
                        let sway = Math.sin(frames * 0.05 + j) * 5;
                        ctx.beginPath();
                        ctx.moveTo(offsetX + j * 100, canvas.height);
                        ctx.quadraticCurveTo(offsetX + j * 100 + sway, canvas.height - 40, offsetX + j * 100 + sway * 1.5, canvas.height - 80);
                        ctx.lineTo(offsetX + j * 100 + 10 + sway * 1.5, canvas.height - 80);
                        ctx.quadraticCurveTo(offsetX + j * 100 + 10 + sway, canvas.height - 40, offsetX + j * 100 + 10, canvas.height);
                        ctx.fill();
                    }
                } else {
                    // RICH JUNGLE OVERHAUL

                    // 1. Background Trees (Silhouettes/Lighter - Far away)
                    for (let t = 0; t < 6; t++) {
                        let sway = Math.sin(frames * 0.01 + t * 2) * 5;
                        let treeX = offsetX + t * 300 + 100;
                        let treeH = 200 + (t % 4) * 40;

                        ctx.fillStyle = "#33691E"; // Lighter/Faded Green

                        // Trunk
                        ctx.beginPath();
                        ctx.moveTo(treeX, canvas.height);
                        ctx.quadraticCurveTo(treeX + sway, canvas.height - treeH / 2, treeX + sway / 2, canvas.height - treeH);
                        ctx.lineWidth = 15;
                        ctx.strokeStyle = "#4E342E"; // Dark Brown
                        ctx.lineCap = "round";
                        ctx.stroke();

                        // Canopy (Cloud style for distance)
                        ctx.beginPath();
                        ctx.arc(treeX + sway / 2, canvas.height - treeH, 40, 0, Math.PI * 2);
                        ctx.arc(treeX + sway / 2 - 25, canvas.height - treeH + 10, 30, 0, Math.PI * 2);
                        ctx.arc(treeX + sway / 2 + 25, canvas.height - treeH + 10, 30, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 2. Foreground Trees (Detailed - Close)
                    for (let t = 0; t < 5; t++) {
                        let sway = Math.sin(frames * 0.02 + t) * 8;
                        let treeX = offsetX + t * 250;
                        let treeH = 300 + (t % 3) * 60; // Taller

                        // Trunk Gradient
                        let trunkGrad = ctx.createLinearGradient(treeX, canvas.height, treeX, canvas.height - treeH);
                        trunkGrad.addColorStop(0, "#3E2723");
                        trunkGrad.addColorStop(1, "#5D4037");
                        ctx.fillStyle = trunkGrad;

                        // Trunk
                        ctx.beginPath();
                        ctx.moveTo(treeX - 15, canvas.height);
                        ctx.quadraticCurveTo(treeX + sway, canvas.height - treeH / 2, treeX + sway, canvas.height - treeH);
                        ctx.lineTo(treeX + sway + 5, canvas.height - treeH);
                        ctx.quadraticCurveTo(treeX + sway + 5, canvas.height - treeH / 2, treeX + 15, canvas.height);
                        ctx.fill();

                        // Lush Canopy
                        let leafColor = (t % 2 === 0) ? "#1B5E20" : "#2E7D32";
                        ctx.fillStyle = leafColor;
                        let crownX = treeX + sway;
                        let crownY = canvas.height - treeH;

                        // Draw clusters
                        for (let c = 0; c < 5; c++) {
                            let angle = (c / 5) * Math.PI * 2;
                            let cx = crownX + Math.cos(angle) * 30;
                            let cy = crownY + Math.sin(angle) * 20;

                            ctx.beginPath();
                            ctx.arc(cx, cy, 35, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        // Center top
                        ctx.beginPath();
                        ctx.arc(crownX, crownY - 10, 40, 0, Math.PI * 2);
                        ctx.fill();

                        // Vines
                        if (t % 3 === 0) {
                            ctx.beginPath();
                            ctx.moveTo(crownX - 20, crownY + 20);
                            ctx.quadraticCurveTo(crownX - 30, crownY + 60, crownX - 20, crownY + 100);
                            ctx.strokeStyle = "#4CAF50";
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }

                    // 3. Ground Bushes/Ferns
                    for (let b = 0; b < 10; b++) {
                        let bx = offsetX + b * 120;
                        ctx.fillStyle = "#2E7D32";
                        ctx.beginPath();
                        ctx.arc(bx, canvas.height, 25 + Math.sin(frames * 0.05 + b) * 5, Math.PI, 0); // Semicircle
                        ctx.fill();
                    }
                }
            }
        }
    }
}

const birdThemes = {
    brown: { body: '#3E2723', highlight: '#795548', wing: '#5D4037' },
    gold: { body: '#FFD700', highlight: '#FFF59D', wing: '#FFA000' },
    blue: { body: '#1976D2', highlight: '#64B5F6', wing: '#0D47A1' },
    red: { body: '#D32F2F', highlight: '#EF5350', wing: '#B71C1C' },
    ramadan: { body: '#Ffffff', highlight: '#FFD700', wing: '#1B5E20' } // White/Gold/Green
};

class Bird {
    constructor() {
        this.x = 100;
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.radius = 20;
        this.rotation = 0;
        this.frame = 0;
    }

    draw() {
        this.frame++;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Physics Rotation
        if (this.velocity < 0) this.rotation = -25 * Math.PI / 180;
        else if (this.velocity > 0) {
            this.rotation += 2 * Math.PI / 180;
            if (this.rotation > 70 * Math.PI / 180) this.rotation = 70 * Math.PI / 180;
        } else {
            this.rotation = 0;
        }
        ctx.rotate(this.rotation);

        // Get Theme
        const theme = birdThemes[birdColor] || birdThemes['brown'];

        // --- 3D EAGLE RENDERING ---

        // 1. Far Wing (Behind body)
        // Flap animation based on frame
        let wingY = Math.sin(this.frame * 0.2) * 20; // Flapping motion
        let wingSkew = Math.cos(this.frame * 0.2) * 5;

        ctx.fillStyle = theme.body;
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.quadraticCurveTo(-20, -20 + wingY, -50 + wingSkew, -10 + wingY);
        ctx.quadraticCurveTo(-30, 10, -10, 5);
        ctx.fill();
        ctx.strokeStyle = '#281815';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Tail
        let tailGrad = ctx.createLinearGradient(-30, 0, -50, 0);
        tailGrad.addColorStop(0, '#FFFFFF');
        tailGrad.addColorStop(1, '#CFD8DC');
        ctx.fillStyle = tailGrad;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-45, -10);
        ctx.lineTo(-45, 10);
        ctx.fill();

        // 3. Body (3D Sphere effect)
        let bodyGrad = ctx.createRadialGradient(-5, 5, 2, -5, 5, 25);
        bodyGrad.addColorStop(0, theme.highlight); // Highlight
        bodyGrad.addColorStop(1, theme.body); // Shadow
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(-5, 5, 22, 14, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Head (3D Sphere)
        let headGrad = ctx.createRadialGradient(15, -8, 2, 12, -5, 15);
        headGrad.addColorStop(0, '#FFFFFF');
        headGrad.addColorStop(1, '#B0BEC5'); // Shadow
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(12, -5, 14, 0, Math.PI * 2);
        ctx.fill();

        // 5. Eye (Shiny)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(16, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye glint
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(17, -9, 1, 0, Math.PI * 2);
        ctx.fill();

        // 6. Beak (3D Cone)
        let beakGrad = ctx.createLinearGradient(18, 0, 32, 5);
        beakGrad.addColorStop(0, '#FFEB3B');
        beakGrad.addColorStop(1, '#FBC02D');
        ctx.fillStyle = beakGrad;
        ctx.beginPath();
        ctx.moveTo(22, -5);
        ctx.quadraticCurveTo(35, 0, 32, 8); // Hook shape
        ctx.lineTo(22, 4);
        ctx.fill();
        ctx.stroke();

        // 7. Near Wing (In front of body)
        // Flap slightly offset from far wing for 3D feel
        ctx.fillStyle = theme.wing;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(-10, -25 + wingY, -45 + wingSkew, -15 + wingY);
        ctx.quadraticCurveTo(-20, 15, 0, 5); // Return to body
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    flap() {
        this.velocity = FLAP;
        this.rotation = -25 * Math.PI / 180;
        sound.flap();
    }

    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;

        if (this.y + this.radius >= canvas.height - 20) {
            this.y = canvas.height - 20 - this.radius;
            gameOver();
        }

        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }
}

const pipes = {
    position: [],

    reset: function () {
        this.position = [];
    },

    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + PIPE_GAP;

            // Iron Pipe Texture (Metallic Gradient)
            // Use colors based on level? Or just standard Green/Iron?
            // "Iron body" usually implies grey or classic green pipe.
            // Let's do a classic Green pipe but with "Iron" shading or Grey if level 3.

            let baseColor, highlightColor, shadowColor;

            if (currentLevel === 3) {
                // City: Dark Grey Iron
                baseColor = "#546E7A";
                highlightColor = "#90A4AE";
                shadowColor = "#37474F";
            } else if (currentLevel === 2) {
                // River: Rusty/Copper or Blueish Iron
                baseColor = "#78909C";
                highlightColor = "#B0BEC5";
                shadowColor = "#455A64";
            } else {
                // Jungle: Classic Green Iron Pipe
                baseColor = "#43A047";
                highlightColor = "#81C784";
                shadowColor = "#1B5E20";
            }

            let pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
            pipeGrad.addColorStop(0, shadowColor);
            pipeGrad.addColorStop(0.1, baseColor);
            pipeGrad.addColorStop(0.4, highlightColor); // Shine
            pipeGrad.addColorStop(0.8, baseColor);
            pipeGrad.addColorStop(1, shadowColor);

            ctx.fillStyle = pipeGrad;
            ctx.strokeStyle = "#000"; // Black outline for cartoon/iron look
            ctx.lineWidth = 2;

            // Draw Top Pipe
            ctx.fillRect(p.x, 0, PIPE_WIDTH, topY);
            ctx.strokeRect(p.x, 0, PIPE_WIDTH, topY);

            // Cap (Iron Ring)
            let capHeight = 25;
            ctx.fillRect(p.x - 4, topY - capHeight, PIPE_WIDTH + 8, capHeight);
            ctx.strokeRect(p.x - 4, topY - capHeight, PIPE_WIDTH + 8, capHeight);

            // Rivets on cap
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(p.x + 5, topY - 12, 3, 0, Math.PI * 2);
            ctx.arc(p.x + PIPE_WIDTH - 5, topY - 12, 3, 0, Math.PI * 2);
            ctx.fill();


            // Draw Bottom Pipe
            ctx.fillStyle = pipeGrad;
            ctx.fillRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);
            ctx.strokeRect(p.x, bottomY, PIPE_WIDTH, canvas.height - bottomY);

            // Cap (Iron Ring)
            ctx.fillRect(p.x - 4, bottomY, PIPE_WIDTH + 8, capHeight);
            ctx.strokeRect(p.x - 4, bottomY, PIPE_WIDTH + 8, capHeight);

            // Rivets on cap
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(p.x + 5, bottomY + 12, 3, 0, Math.PI * 2);
            ctx.arc(p.x + PIPE_WIDTH - 5, bottomY + 12, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    update: function () {
        if (frames % SPAWN_RATE === 0) {
            const minPipeLen = 100;
            const maxPos = canvas.height - 100 - minPipeLen - PIPE_GAP;
            const minPos = minPipeLen;
            const y = Math.floor(Math.random() * (maxPos - minPos + 1)) + minPos;

            this.position.push({
                x: canvas.width,
                y: y,
                passed: false
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= PIPE_SPEED_VAR;


            function showLevelUp(text) {
                levelDisplay.innerText = text;
                levelDisplay.classList.remove('hidden');
                // Force reflow for animation restart
                void levelDisplay.offsetWidth;
                // Hide after animation (approx 2s)
                setTimeout(() => {
                    levelDisplay.classList.add('hidden');
                }, 2000);
            }

            // ... inside pipes update ...
            if (p.x + PIPE_WIDTH <= 0) {
                this.position.shift();
                score++;
                scoreDisplay.innerText = score;
                // Animation
                scoreDisplay.classList.remove('score-pop');
                void scoreDisplay.offsetWidth; // Force Reflow
                scoreDisplay.classList.add('score-pop');

                sound.score();

                // Ramadan Event: No Level Changes for now, or maybe speed up only?
                if (score % 20 === 0) {
                    PIPE_SPEED_VAR += 0.05;
                    showLevelUp("Speed Up!");
                }

                /*
                // Level Check
                if (score === 20 && currentLevel === 1) {
                    currentLevel = 2;
                    showLevelUp("Level 2: Medium");
                    // Speed up
                    PIPE_SPEED_VAR = PIPE_SPEED_BASE * 1.01; // 1% increase
                } else if (score === 50 && currentLevel === 2) {
                    currentLevel = 3;
                    showLevelUp("Level 3: Hard");
                    PIPE_SPEED_VAR = PIPE_SPEED_BASE * 1.06; // 6% increase
                } else if (score === 100 && currentLevel === 3) {
                    currentLevel = 4;
                    showLevelUp("Level 4: Extreme");
                    PIPE_SPEED_VAR = PIPE_SPEED_BASE * 1.08; // 8% increase
                } else if (score === 180 && currentLevel === 4) {
                    currentLevel = 5;
                    showLevelUp("Level 5: Pro");
                    PIPE_SPEED_VAR = PIPE_SPEED_BASE * 1.10; // 10% increase
                }
                */

                i--;
                continue;
            }

            // Collision
            // Reduced collision box for fairness with irregular shapes
            const hitBoxMargin = 5;
            const birdLeft = bird.x - bird.radius + hitBoxMargin;
            const birdRight = bird.x + bird.radius - hitBoxMargin;
            const birdTop = bird.y - bird.radius + hitBoxMargin;
            const birdBottom = bird.y + bird.radius - hitBoxMargin;

            const pipeLeft = p.x;
            const pipeRight = p.x + PIPE_WIDTH;
            const topPipeBottom = p.y;
            const bottomPipeTop = p.y + PIPE_GAP;

            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
                    gameOver();
                }
            }
        }
    }
}

// Background Manager
const bg = {
    draw: function () {
        layers.sky.draw();
        layers.clouds.draw();
        layers.birds.draw(); // Draw birds behind mountains? Or in front? Let's say in front of clouds, behind mountains for depth
        layers.mountains.draw();

        // Ground is part of trees/foreground usually, but we keep a consistent floor
        // Use Trees layer for parallax "mid ground"
        layers.trees.draw();

        // Floor (Main ground)
        let t = themes[currentLevel];
        ctx.fillStyle = t.ground;
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        // Grass/Top
        ctx.fillStyle = t.grass;
        ctx.fillRect(0, canvas.height - 30, canvas.width, 10);
    }
}

const bird = new Bird();

const PIPE_SPEED_BASE = 2.1;
let PIPE_SPEED_VAR = PIPE_SPEED_BASE;

let lastTime = 0;
const FPS_LIMIT = 60;
const FRAME_DURATION = 1000 / FPS_LIMIT;

function init() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes.reset();
    score = 0;
    frames = 0;
    currentLevel = 6; // Reset Level to Ramadan
    PIPE_SPEED_VAR = PIPE_SPEED_BASE; // Reset Speed
    scoreDisplay.innerText = score;
    gameState = 'START';
    lastTime = 0; // Reset time

    startScreen.classList.remove('hidden');
    shopScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelDisplay.classList.add('hidden'); // Ensure hidden

    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (gameState !== 'PLAYING' && gameState !== 'START') return;

    requestAnimationFrame(loop);

    if (!lastTime) { lastTime = timestamp; return; }

    const deltaTime = timestamp - lastTime;

    if (deltaTime >= FRAME_DURATION) {
        lastTime = timestamp - (deltaTime % FRAME_DURATION);

        // Clear handled by sky draw usually, but we need consistency

        if (gameState === 'PLAYING') {
            // BG draws
            bg.draw();
            pipes.update();
            pipes.draw();
            bird.update();
            bird.draw();
            frames++;
        } else if (gameState === 'START') {
            // Draw static bg
            layers.sky.draw();
            // Don't scroll layers
            let tmpSpeed1 = layers.clouds.speed;
            let tmpSpeed2 = layers.mountains.speed;
            let tmpSpeed3 = layers.trees.speed;

            layers.clouds.speed = 0.2; // Slow scroll for ambiance
            layers.mountains.speed = 0;
            layers.trees.speed = 0;

            layers.clouds.draw();
            layers.mountains.draw();
            layers.trees.draw();

            // Restore speeds
            layers.clouds.speed = tmpSpeed1;
            layers.mountains.speed = tmpSpeed2;
            layers.trees.speed = tmpSpeed3;

            // Ground
            ctx.fillStyle = '#3E2723';
            ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
            ctx.fillStyle = '#43A047';
            ctx.fillRect(0, canvas.height - 30, canvas.width, 10);

            // Bird hover
            bird.y = canvas.height / 2 + Math.sin(Date.now() / 500) * 10;
            bird.draw();
        }
    }
}

function startGame() {
    if (gameState === 'PLAYING') return;
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    bird.y = canvas.height / 2;
    bird.velocity = 0;
}

function gameOver() {
    if (gameState === 'GAMEOVER') return; // Prevent double crash sound
    sound.crash();
    gameState = 'GAMEOVER';
    finalScoreSpan.innerText = score;

    // High Score Logic
    let highScore = localStorage.getItem('flappyHighScore') || 0;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    // Update Best Score Display
    const bestScoreEl = document.getElementById('best-score');
    if (bestScoreEl) bestScoreEl.innerText = highScore;

    gameOverScreen.classList.remove('hidden');

    // Screen Shake
    const container = document.getElementById('game-container');
    container.classList.add('shake');
    setTimeout(() => {
        container.classList.remove('shake');
    }, 500);

    // Firework Celebration if score > 0
    if (score > 0) {
        for (let i = 0; i < 30; i++) {
            createFirework();
        }
    }
}

function createFirework() {
    const el = document.createElement('div');
    el.classList.add('firework');
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;

    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 150;
    const fx = Math.cos(angle) * dist + 'px';
    const fy = Math.sin(angle) * dist + 'px';

    el.style.setProperty('--fx', fx);
    el.style.setProperty('--fy', fy);

    gameOverScreen.appendChild(el);

    // Cleanup
    setTimeout(() => {
        el.remove();
    }, 1000);
}

// Input Handling
window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        if (gameState === 'START') {
            if (!shopScreen.classList.contains('hidden')) return; // Don't start if shop is open
            startGame();
            bird.flap();
        } else if (gameState === 'PLAYING') {
            bird.flap();
        } else if (gameState === 'GAMEOVER') {
            init();
        }
    }
});

window.addEventListener('mousedown', function (e) {
    // Prevent default behavior if needed, but allow buttons
    if (e.target.tagName === 'BUTTON') return; // Let button clicks handle themselves

    if (gameState === 'START') {
        // Only start via Play Button now
        // startGame(); 
        // bird.flap();
    } else if (gameState === 'PLAYING') {
        bird.flap();
    } else if (gameState === 'GAMEOVER') {
        // Optional: Click anywhere to restart? 
        // Let's stick to the button for restart to avoid accidental restarts
        // Or we can allow it if the user wants "click important"
        // Let's allow it but maybe with a cooldown? For now just init.
        // Actually, if they click the restart button, this might fire too if we don't check target.
        // The check e.target.tagName above handles the button case.
        init();
    }
});

homeBtn.addEventListener('click', function () {
    // Standard restart which goes to home
    init();
});

const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', async () => {
    const shareData = {
        title: 'Flappy Eagle',
        text: `I scored ${score} in Flappy Eagle! Can you beat me?`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Error sharing:', err);
        }
    } else {
        // Fallback
        navigator.clipboard.writeText(`I scored ${score} in Flappy Eagle! Play here: ${window.location.href}`)
            .then(() => {
                const originalText = shareBtn.innerText;
                shareBtn.innerText = "Copied!";
                setTimeout(() => {
                    shareBtn.innerText = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    }
}); // End of shareBtn listener

// --- MENU EVENT LISTENERS ---
playBtn.addEventListener('click', () => {
    startGame();
    bird.flap(); // Initial jump
});

shopBtn.addEventListener('click', () => {
    shopScreen.classList.remove('hidden');
    updateShopUI(); // Ensure correct tick is shown
});

closeShopBtn.addEventListener('click', () => {
    shopScreen.classList.add('hidden');
    startScreen.classList.remove('hidden'); // Ensure we go back to Home
});

exitBtn.addEventListener('click', () => {
    // Attempt to close window (only works if script opened it)
    window.close();
    // Fallback: Reload to "reset" or show goodbye
    location.reload();
});

// --- AUDIO SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const sound = {
    playTone: function (freq, type, duration) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    flap: function () {
        // Chirp: High pitch sine sweep
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },

    crash: function () {
        // Thud: Low sawtooth
        this.playTone(100, 'sawtooth', 0.3);
    },

    score: function () {
        // Ping
        this.playTone(1000, 'sine', 0.1);
    }
}

// Shop Update Function
function updateShopUI() {
    // Remove selected class from all
    document.querySelectorAll('.shop-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Add to current color
    const selectedItem = document.getElementById(`item-${birdColor}`);
    if (selectedItem) selectedItem.classList.add('selected');
}

// Shop select handler
function setBirdColor(color) {
    if (birdThemes[color]) {
        birdColor = color;
        // Optional: Save to local storage
        try {
            localStorage.setItem('birdColor', color);
        } catch (e) { }
        updateShopUI();
    }
}

// Load saved color
try {
    const savedColor = localStorage.getItem('birdColor');
    if (savedColor && birdThemes[savedColor]) {
        birdColor = savedColor;
    }
} catch (e) { }

// Initialize Shop UI
updateShopUI();

// --- MENU EVENT LISTENERS (Updated) ---
// We already have listeners but need to ensure correct behavior
// Re-attaching closeShopBtn listener here to be sure, or just rely on existing one if it works.
// The existing listener just does `shopScreen.classList.add('hidden')`.
// Let's modify it to be explicit about showing start screen if we want.

const closeShopBtnRef = document.getElementById('close-shop-btn');
if (closeShopBtnRef) {
    // Remove old listener to avoid duplicates if possible, or just overwrite behavior in next step
    // Since we can't easily remove anonymous listeners, we will rely on editing the block above where they are defined.
}

// Kickoff
init();
