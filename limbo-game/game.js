// SHADOWS - A Limbo-inspired 2.5D Platformer
// Level 1: The Descent

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const deathScreen = document.getElementById('death-screen');
const levelCompleteScreen = document.getElementById('level-complete');

// Game constants
const GRAVITY = 0.6;
const FRICTION = 0.85;
const MOVE_SPEED = 0.8;
const MAX_SPEED = 6;
const JUMP_FORCE = -14;
const DOUBLE_JUMP_FORCE = -12;

// Camera
let camera = { x: 0, y: 0 };

// Player
let player = {
    x: 100,
    y: 300,
    width: 30,
    height: 50,
    vx: 0,
    vy: 0,
    onGround: false,
    canDoubleJump: false,
    facing: 1,
    animFrame: 0,
    animTimer: 0,
    dead: false,
    won: false
};

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    if ((e.code === 'KeyR' || e.code === 'Enter') && (player.dead || player.won)) {
        resetLevel();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Level data - platforms, hazards, collectibles
const levelData = {
    platforms: [
        // Starting area
        { x: 0, y: 400, width: 300, height: 140, type: 'ground' },
        
        // First jump series
        { x: 350, y: 380, width: 120, height: 20, type: 'platform' },
        { x: 520, y: 340, width: 100, height: 20, type: 'platform' },
        { x: 670, y: 300, width: 150, height: 20, type: 'platform' },
        
        // Ground section with spike pit
        { x: 900, y: 400, width: 400, height: 140, type: 'ground' },
        { x: 1300, y: 400, width: 150, height: 20, type: 'platform' },
        
        // Spike pit
        { x: 1450, y: 450, width: 200, height: 90, type: 'ground' },
        
        // Rising platforms
        { x: 1700, y: 380, width: 100, height: 20, type: 'platform' },
        { x: 1850, y: 320, width: 100, height: 20, type: 'platform' },
        { x: 2000, y: 260, width: 100, height: 20, type: 'platform' },
        { x: 2150, y: 200, width: 200, height: 20, type: 'platform' },
        
        // Upper ground with hanging obstacle
        { x: 2400, y: 200, width: 500, height: 340, type: 'ground' },
        
        // Final challenge - moving platform simulation
        { x: 2950, y: 250, width: 120, height: 20, type: 'platform' },
        { x: 3150, y: 300, width: 100, height: 20, type: 'platform' },
        { x: 3300, y: 380, width: 300, height: 160, type: 'ground' },
        
        // Walls
        { x: -50, y: 0, width: 50, height: 540, type: 'wall' },
        { x: 3600, y: 0, width: 50, height: 540, type: 'wall' }
    ],
    
    hazards: [
        // Spikes in the pit
        { x: 820, y: 520, width: 80, height: 20, type: 'spikes' },
        { x: 1450, y: 520, width: 200, height: 20, type: 'spikes' }
    ],
    
    // Hanging pendulum traps
    traps: [
        { x: 1050, y: 150, width: 40, height: 100, swing: 80, speed: 0.03, offset: 0 },
        { x: 2600, y: 120, width: 50, height: 120, swing: 100, speed: 0.025, offset: Math.PI }
    ],
    
    // Background elements for parallax
    bgElements: [
        { x: 200, y: 100, width: 60, height: 200, layer: 3 },
        { x: 600, y: 50, width: 80, height: 300, layer: 3 },
        { x: 1100, y: 80, width: 50, height: 250, layer: 3 },
        { x: 1500, y: 120, width: 70, height: 180, layer: 3 },
        { x: 2000, y: 60, width: 90, height: 280, layer: 3 },
        { x: 2500, y: 90, width: 60, height: 220, layer: 3 },
        { x: 3000, y: 70, width: 75, height: 260, layer: 3 },
        { x: 3400, y: 100, width: 55, height: 200, layer: 3 },
        
        // Distant trees/structures
        { x: 100, y: 200, width: 30, height: 150, layer: 2 },
        { x: 400, y: 180, width: 40, height: 170, layer: 2 },
        { x: 800, y: 190, width: 35, height: 160, layer: 2 },
        { x: 1200, y: 170, width: 45, height: 180, layer: 2 },
        { x: 1700, y: 200, width: 30, height: 140, layer: 2 },
        { x: 2200, y: 180, width: 40, height: 170, layer: 2 },
        { x: 2700, y: 190, width: 35, height: 160, layer: 2 },
        { x: 3200, y: 170, width: 45, height: 180, layer: 2 }
    ],
    
    // Goal
    goal: { x: 3500, y: 320, width: 60, height: 60 }
};

// Trap animation state
let trapStates = levelData.traps.map(() => 0);

function resetLevel() {
    player.x = 100;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.canDoubleJump = false;
    player.dead = false;
    player.won = false;
    player.facing = 1;
    deathScreen.style.display = 'none';
    levelCompleteScreen.style.display = 'none';
    camera.x = 0;
}

function update() {
    if (player.dead || player.won) return;
    
    // Horizontal movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.vx -= MOVE_SPEED;
        player.facing = -1;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.vx += MOVE_SPEED;
        player.facing = 1;
    }
    
    // Apply friction
    player.vx *= FRICTION;
    
    // Clamp speed
    if (player.vx > MAX_SPEED) player.vx = MAX_SPEED;
    if (player.vx < -MAX_SPEED) player.vx = -MAX_SPEED;
    
    // Stop if very slow
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
    
    // Jumping
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && !keys.jumpHeld) {
        keys.jumpHeld = true;
        if (player.onGround) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
            player.canDoubleJump = true;
        } else if (player.canDoubleJump) {
            player.vy = DOUBLE_JUMP_FORCE;
            player.canDoubleJump = false;
        }
    }
    
    if (!keys['Space'] && !keys['ArrowUp'] && !keys['KeyW']) {
        keys.jumpHeld = false;
    }
    
    // Apply gravity
    player.vy += GRAVITY;
    
    // Terminal velocity
    if (player.vy > 15) player.vy = 15;
    
    // Move player
    player.x += player.vx;
    player.y += player.vy;
    
    // Animation
    if (Math.abs(player.vx) > 0.5) {
        player.animTimer++;
        if (player.animTimer > 8) {
            player.animFrame = (player.animFrame + 1) % 4;
            player.animTimer = 0;
        }
    } else {
        player.animFrame = 0;
    }
    
    // Collision detection
    player.onGround = false;
    
    for (const platform of levelData.platforms) {
        const collision = checkCollision(player, platform);
        if (collision) {
            resolveCollision(player, platform, collision);
        }
    }
    
    // Check hazards
    for (const hazard of levelData.hazards) {
        if (checkCollision(player, hazard)) {
            killPlayer();
            return;
        }
    }
    
    // Check traps
    for (let i = 0; i < levelData.traps.length; i++) {
        const trap = levelData.traps[i];
        const swingOffset = Math.sin(Date.now() * trap.speed + trap.offset) * trap.swing;
        const trapX = trap.x + swingOffset;
        
        const trapHitbox = {
            x: trapX,
            y: trap.y,
            width: trap.width,
            height: trap.height
        };
        
        if (checkCollision(player, trapHitbox)) {
            killPlayer();
            return;
        }
    }
    
    // Check goal
    if (checkCollision(player, levelData.goal)) {
        player.won = true;
        levelCompleteScreen.style.display = 'flex';
    }
    
    // Fall death
    if (player.y > 600) {
        killPlayer();
    }
    
    // Update camera
    const targetCameraX = player.x - canvas.width / 3;
    camera.x += (targetCameraX - camera.x) * 0.1;
    
    // Clamp camera
    camera.x = Math.max(0, Math.min(camera.x, 3600 - canvas.width));
}

function checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function resolveCollision(player, platform, collision) {
    const { overlapX, overlapY } = collision;
    
    if (Math.abs(overlapX) < Math.abs(overlapY)) {
        // Horizontal collision
        if (overlapX > 0) {
            player.x = platform.x - player.width;
        } else {
            player.x = platform.x + platform.width;
        }
        player.vx = 0;
    } else {
        // Vertical collision
        if (overlapY > 0) {
            player.y = platform.y - player.height;
            player.vy = 0;
            player.onGround = true;
            player.canDoubleJump = true;
        } else {
            player.y = platform.y + platform.height;
            player.vy = 0;
        }
    }
}

function getCollisionData(a, b) {
    const overlapX = (a.width + b.width) / 2 - Math.abs((a.x + a.width / 2) - (b.x + b.width / 2));
    const overlapY = (a.height + b.height) / 2 - Math.abs((a.y + a.height / 2) - (b.y + b.height / 2));
    
    return { overlapX, overlapY };
}

function killPlayer() {
    player.dead = true;
    deathScreen.style.display = 'flex';
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw parallax background elements
    for (const element of levelData.bgElements) {
        const parallaxX = element.x - camera.x * (element.layer / 4);
        const alpha = 0.3 - (element.layer * 0.08);
        
        ctx.fillStyle = `rgba(30, 30, 30, ${alpha})`;
        ctx.fillRect(parallaxX, element.y, element.width, element.height);
        
        // Add some texture
        ctx.fillStyle = `rgba(20, 20, 20, ${alpha + 0.1})`;
        ctx.fillRect(parallaxX + 5, element.y + 10, element.width - 10, element.height - 20);
    }
    
    ctx.save();
    ctx.translate(-camera.x, 0);
    
    // Draw platforms with 2.5D effect
    for (const platform of levelData.platforms) {
        drawPlatform(platform);
    }
    
    // Draw hazards
    for (const hazard of levelData.hazards) {
        drawSpikes(hazard);
    }
    
    // Draw traps
    for (let i = 0; i < levelData.traps.length; i++) {
        const trap = levelData.traps[i];
        const swingOffset = Math.sin(Date.now() * trap.speed + trap.offset) * trap.swing;
        drawTrap(trap.x + swingOffset, trap.y, trap.width, trap.height);
    }
    
    // Draw goal
    drawGoal(levelData.goal);
    
    // Draw player
    if (!player.dead) {
        drawPlayer();
    }
    
    ctx.restore();
    
    // Draw vignette effect
    drawVignette();
}

function drawPlatform(platform) {
    const mainColor = '#1a1a1a';
    const highlightColor = '#2a2a2a';
    const shadowColor = '#0a0a0a';
    
    // Main platform body
    ctx.fillStyle = mainColor;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    
    // Top highlight (2.5D effect)
    ctx.fillStyle = highlightColor;
    ctx.fillRect(platform.x, platform.y, platform.width, 4);
    
    // Side shadow for depth
    ctx.fillStyle = shadowColor;
    ctx.fillRect(platform.x + platform.width - 4, platform.y, 4, platform.height);
    
    // Bottom shadow
    ctx.fillStyle = shadowColor;
    ctx.fillRect(platform.x, platform.y + platform.height - 4, platform.width, 4);
    
    // Add some texture/noise
    ctx.fillStyle = 'rgba(40, 40, 40, 0.3)';
    for (let i = 0; i < platform.width; i += 20) {
        ctx.fillRect(platform.x + i, platform.y + 10, 2, platform.height - 20);
    }
}

function drawSpikes(hazard) {
    const spikeCount = Math.floor(hazard.width / 20);
    const spikeWidth = hazard.width / spikeCount;
    
    ctx.fillStyle = '#2a2a2a';
    
    for (let i = 0; i < spikeCount; i++) {
        const x = hazard.x + i * spikeWidth;
        ctx.beginPath();
        ctx.moveTo(x, hazard.y + hazard.height);
        ctx.lineTo(x + spikeWidth / 2, hazard.y);
        ctx.lineTo(x + spikeWidth, hazard.y + hazard.height);
        ctx.closePath();
        ctx.fill();
    }
    
    // Highlight
    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < spikeCount; i++) {
        const x = hazard.x + i * spikeWidth;
        ctx.beginPath();
        ctx.moveTo(x + 3, hazard.y + hazard.height);
        ctx.lineTo(x + spikeWidth / 2, hazard.y + 5);
        ctx.lineTo(x + spikeWidth / 2 + 2, hazard.y + hazard.height);
        ctx.closePath();
        ctx.fill();
    }
}

function drawTrap(x, y, width, height) {
    // Rope/chain
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y - 50);
    ctx.lineTo(x + width / 2, y);
    ctx.stroke();
    
    // Spiked block
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);
    
    // Spikes on bottom
    const spikeCount = Math.floor(width / 10);
    ctx.fillStyle = '#2a2a2a';
    for (let i = 0; i < spikeCount; i++) {
        const spikeX = x + i * 10 + 5;
        ctx.beginPath();
        ctx.moveTo(spikeX, y + height);
        ctx.lineTo(spikeX + 5, y + height + 8);
        ctx.lineTo(spikeX + 10, y + height);
        ctx.closePath();
        ctx.fill();
    }
    
    // Highlight
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + 3, y, 5, height);
}

function drawGoal(goal) {
    // Glowing portal effect
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
        goal.x + goal.width / 2, goal.y + goal.height / 2, 0,
        goal.x + goal.width / 2, goal.y + goal.height / 2, goal.width
    );
    gradient.addColorStop(0, `rgba(200, 200, 200, ${pulse * 0.5})`);
    gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(goal.x - goal.width / 2, goal.y - goal.height / 2, goal.width * 2, goal.height * 2);
    
    // Inner circle
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
    ctx.beginPath();
    ctx.arc(goal.x + goal.width / 2, goal.y + goal.height / 2, goal.width / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Ring
    ctx.strokeStyle = `rgba(200, 200, 200, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(goal.x + goal.width / 2, goal.y + goal.height / 2, goal.width / 2, 0, Math.PI * 2);
    ctx.stroke();
}

function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;
    
    // Silhouette body
    ctx.fillStyle = '#0a0a0a';
    
    // Body with slight animation
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    
    // Head bobbing
    const headBob = player.onGround ? Math.sin(player.animFrame * Math.PI / 2) * 2 : 0;
    
    // Shoulders
    ctx.lineTo(x + w * 0.2, y + h * 0.3);
    ctx.lineTo(x, y + h * 0.5);
    
    // Legs animation
    const legAngle = player.animFrame * Math.PI / 4;
    const legOffset = Math.sin(legAngle) * 5;
    
    ctx.lineTo(x + legOffset, y + h);
    ctx.lineTo(x + w * 0.4, y + h * 0.8);
    ctx.lineTo(x + w * 0.6, y + h * 0.8);
    ctx.lineTo(x + w - legOffset, y + h);
    
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w * 0.8, y + h * 0.3);
    ctx.lineTo(x + w * 0.5, y);
    ctx.closePath();
    ctx.fill();
    
    // Glowing eyes
    const eyeGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 255, ${eyeGlow})`;
    
    const eyeX = player.facing === 1 ? x + w * 0.6 : x + w * 0.3;
    const eyeY = y + h * 0.25 + headBob;
    
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye glow effect
    const eyeGradient = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, 8);
    eyeGradient.addColorStop(0, `rgba(255, 255, 255, ${eyeGlow * 0.5})`);
    eyeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = eyeGradient;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawVignette() {
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height / 3,
        canvas.width / 2, canvas.height / 2, canvas.height
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Particle system for atmosphere
const particles = [];

function createParticles() {
    if (particles.length < 50 && Math.random() < 0.1) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            life: 1
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.005;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.fillStyle = `rgba(100, 100, 100, ${p.life * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    createParticles();
    updateAndDrawParticles();
    requestAnimationFrame(gameLoop);
}

// Start the game
resetLevel();
gameLoop();

console.log('SHADOWS - Level 1: The Descent');
console.log('Controls: Arrow Keys/WASD to move, Space to jump, R to restart');
