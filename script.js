const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game constants
const GRAVITY = 0.4; // Stronger gravity for faster fall
const FLAP = -7;     // Stronger flap
const SPAWN_RATE = 70; // Faster spawn for faster speed
const PIPE_WIDTH = 70; // Thicker for trees
const PIPE_GAP = 160; // Slightly wider gap for higher speed
const PIPE_SPEED = 5; // Faster scrolling

// Game state
let frames = 0;
let score = 0;
let gameState = 'START';
let currentLevel = 1;

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const finalScoreSpan = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

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

                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; // White-ish silhouette
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
                } else if (currentLevel === 2) {
                    // Reeds for river
                    for (let j = 0; j < 15; j++) {
                        ctx.beginPath();
                        ctx.ellipse(offsetX + j * 100, canvas.height, 10, 80 + (j % 3) * 20, 0, 0, Math.PI, true);
                        ctx.fill();
                    }
                } else {
                    // Jungle trees
                    for (let t = 0; t < 10; t++) {
                        ctx.beginPath();
                        ctx.moveTo(offsetX + t * 200, canvas.height);
                        ctx.lineTo(offsetX + t * 200 + 50, canvas.height - 150 - (t % 3) * 50);
                        ctx.lineTo(offsetX + t * 200 + 100, canvas.height);
                        ctx.fill();
                    }
                }
            }
        }
    }
}

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

        // --- 3D EAGLE RENDERING ---

        // 1. Far Wing (Behind body)
        // Flap animation based on frame
        let wingY = Math.sin(this.frame * 0.2) * 20; // Flapping motion
        let wingSkew = Math.cos(this.frame * 0.2) * 5;

        ctx.fillStyle = '#3E2723';
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
        bodyGrad.addColorStop(0, '#795548'); // Highlight
        bodyGrad.addColorStop(1, '#3E2723'); // Shadow
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
        ctx.fillStyle = '#5D4037';
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
            p.x -= PIPE_SPEED;


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
                sound.score();

                // Level Check
                if (score === 20 && currentLevel === 1) {
                    currentLevel = 2;
                    showLevelUp("Level 2: Medium");
                    // Speed up
                    PIPE_SPEED_VAR = 6;
                } else if (score === 50 && currentLevel === 2) {
                    currentLevel = 3;
                    showLevelUp("Level 3: Hard");
                    PIPE_SPEED_VAR = 7;
                }

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

const PIPE_SPEED_BASE = 5;
let PIPE_SPEED_VAR = PIPE_SPEED_BASE;

function init() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes.reset();
    score = 0;
    frames = 0;
    currentLevel = 1; // Reset Level
    PIPE_SPEED_VAR = PIPE_SPEED_BASE; // Reset Speed
    scoreDisplay.innerText = score;
    gameState = 'START';

    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    levelDisplay.classList.add('hidden'); // Ensure hidden

    loop();
}

function loop() {
    // Clear handled by sky draw

    // Update BG even in start screen for nice effect?
    // Let's only move parallax when playing, but draw always

    if (gameState === 'PLAYING') {
        // BG draws
        bg.draw();
        pipes.update();
        pipes.draw();
        bird.update();
        bird.draw();
        frames++;
        requestAnimationFrame(loop);
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

        requestAnimationFrame(loop);
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
    gameOverScreen.classList.remove('hidden');
}

// Input Handling
window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        if (gameState === 'START') {
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
        startGame();
        bird.flap();
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

restartBtn.addEventListener('click', function () {
    init();
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

// Kickoff
init();
