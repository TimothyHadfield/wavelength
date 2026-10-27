// ================================================================
// SPECTRUM CARD LISTS
// ================================================================
// Built-in lists come from js/cards.js; lists the players make are saved on this device.
const LISTS_KEY = 'wavelength:lists';
const CARD_LISTS = (window.WL_LISTS || []).map(l => ({ name: l.name, builtin: true, cards: l.cards }));
// Which lists are selected for the game + which are expanded in the Cards sheet
let selectedListIndices = new Set(CARD_LISTS.map((_, i) => i));
let expandedListIndices = new Set();
loadSavedLists();

function loadSavedLists() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LISTS_KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') return;
    const clean = (s) => String(s == null ? '' : s).trim().slice(0, 30);
    (Array.isArray(saved.custom) ? saved.custom : []).slice(0, 50).forEach(l => {
        if (!l || typeof l !== 'object') return;
        const cards = (Array.isArray(l.cards) ? l.cards : []).slice(0, 500)
            .map(c => ({ left: clean(c && c.left), right: clean(c && c.right) })).filter(c => c.left && c.right);
        const name = clean(l.name).slice(0, 30);
        if (name) CARD_LISTS.push({ name, builtin: false, cards });
    });
    if (Array.isArray(saved.off)) {
        // 'off' holds the names of lists the players unticked, so new built-in lists start ticked
        const off = new Set(saved.off.map(String));
        selectedListIndices = new Set(CARD_LISTS.map((l, i) => i).filter(i => !off.has(CARD_LISTS[i].name)));
    }
}
function saveLists() {
    const data = {
        custom: CARD_LISTS.filter(l => !l.builtin).map(l => ({ name: l.name, cards: l.cards })),
        off: CARD_LISTS.filter((l, i) => !selectedListIndices.has(i)).map(l => l.name),
    };
    try { localStorage.setItem(LISTS_KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: lists last until the tab closes */ }
}

// Active card pool — built from selected lists at game start
let SPECTRUM_CARDS = [];

// ================================================================
// GAME STATE
// ================================================================
const GamePhase = {
    MENU: 'MENU',
    PSYCHIC_PREP: 'PSYCHIC_PREP',
    CLUE_ENTRY: 'CLUE_ENTRY',
    GUESS_PHASE: 'GUESS_PHASE',
    COUNTER_GUESS: 'COUNTER_GUESS',
    REVEAL: 'REVEAL',
    GAME_OVER: 'GAME_OVER'
};

const gameState = {
    phase: GamePhase.MENU,
    targetScore: 10,
    teams: [
        { name: 'Team 1', score: 0, color: '#00d9ff', players: [], hinterIndex: 0 },
        { name: 'Team 2', score: 0, color: '#ff6b6b', players: [], hinterIndex: 0 }
    ],
    activeTeamIndex: 0,
    roundNumber: 1,
    round: {
        spectrumCard: null,
        targetAngle: 90,
        hinterName: '',
        clue: '',
        guessAngle: 90,
        counterGuess: null,
        pointsAwarded: null,
        revealed: false
    },
    usedCardIndices: [],
    roundHistory: []
};

// ================================================================
// DIAL GEOMETRY & INTERACTION STATE
// ================================================================
const dialGeo = { cx: 0, cy: 0, radius: 0 };
let isDragging = false;

// 20 sections on the dial, each 9°. Target = 5 sections wide.
// Each scoring tier is 1 section wide (9°) from the center outward.
const SECTION_DEG = 9;
const ZONE_BULLSEYE = SECTION_DEG * 0.5;  // ±4.5° = 1 section centered
const ZONE_CLOSE = SECTION_DEG * 1.5;     // ±13.5° = extends 1 more section each side
const ZONE_NEAR = SECTION_DEG * 2.5;      // ±22.5° = extends 1 more section each side

let revealAnim = { active: false, startTime: 0, duration: 1200 };
let scorePopups = [];

// Counter guess interaction state
let counterHoverSide = null;    // null | 'LEFT' | 'RIGHT'
let counterSelectedSide = null; // null | 'LEFT' | 'RIGHT'

// ================================================================
// MENU: PLAYER MANAGEMENT
// ================================================================
function addPlayer(listId) {
    const list = document.getElementById(listId);
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = '<input type="text" placeholder="Player name" maxlength="20" /><button class="btn-remove-player" aria-label="Remove player" onclick="removePlayer(this)">&times;</button>';
    list.appendChild(row);
    row.querySelector('input').focus();
}

function removePlayer(btn) {
    const row = btn.parentElement;
    const list = row.parentElement;
    if (list.querySelectorAll('.player-row').length <= 2) return;
    row.remove();
}

// Names, list names and card text are typed by players; escape them before putting them in innerHTML
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getPlayersFromList(listId) {
    const inputs = document.getElementById(listId).querySelectorAll('.player-row input');
    const names = [];
    inputs.forEach((input, i) => {
        names.push(input.value.trim() || `Player ${i + 1}`);
    });
    return names;
}

// ================================================================
// MENU: SPECTRUM CARD LIST MANAGER
// ================================================================
function renderCardManager() {
    const container = document.getElementById('cardListsContainer');
    let html = '';
    CARD_LISTS.forEach((list, li) => {
        const checked = selectedListIndices.has(li) ? 'checked' : '';
        const expanded = expandedListIndices.has(li);
        html += `<div class="card-list-row">`;
        html += `<div class="card-list-header" onclick="toggleListExpand(${li})">`;
        html += `<input type="checkbox" ${checked} aria-label="Use ${escapeHtml(list.name)} list" onclick="event.stopPropagation(); toggleListSelection(${li})" />`;
        html += `<span class="list-name${list.builtin ? ' builtin' : ''}">${escapeHtml(list.name)}</span>`;
        html += `<span class="list-count">(${list.cards.length})</span>`;
        html += `<span class="list-expand${expanded ? ' open' : ''}">&#9660;</span>`;
        if (!list.builtin) {
            html += `<button class="btn-delete-list" onclick="event.stopPropagation(); deleteList(${li})" title="Delete list">&times;</button>`;
        }
        html += `</div>`;
        html += `<div class="card-list-cards${expanded ? ' open' : ''}">`;
        if (!list.builtin) {
            html += `<div class="card-add-row">`;
            html += `<input type="text" id="addLeft_${li}" placeholder="Left (e.g. Hot)" maxlength="30" onkeydown="if(event.key==='Enter')addCardToList(${li})" />`;
            html += `<span class="arrow-label">&harr;</span>`;
            html += `<input type="text" id="addRight_${li}" placeholder="Right (e.g. Cold)" maxlength="30" onkeydown="if(event.key==='Enter')addCardToList(${li})" />`;
            html += `<button class="btn-add-card" onclick="addCardToList(${li})">+ Add</button>`;
            html += `</div>`;
        }
        html += `<div class="card-chips">`;
        list.cards.forEach((card, ci) => {
            html += `<div class="card-chip">`;
            html += `${escapeHtml(card.left)} <span class="chip-arrow">&harr;</span> ${escapeHtml(card.right)}`;
            if (!list.builtin) {
                html += `<button class="chip-remove" onclick="removeCardFromList(${li},${ci})" title="Remove">&times;</button>`;
            }
            html += `</div>`;
        });
        html += `</div></div></div>`;
    });
    container.innerHTML = html;
    updateCardsButton();
    saveLists(); // every change to the lists ends in a re-render, so this saves them all
}

function toggleListSelection(li) {
    if (selectedListIndices.has(li)) {
        selectedListIndices.delete(li);
    } else {
        selectedListIndices.add(li);
    }
    renderCardManager();
}

function toggleListExpand(li) {
    if (expandedListIndices.has(li)) {
        expandedListIndices.delete(li);
    } else {
        expandedListIndices.add(li);
    }
    renderCardManager();
}

// In-page replacement for the browser prompt(): resolves to the typed text, or null on Cancel/Escape/backdrop
function appPrompt(msg, defaultValue = '') {
    return new Promise(resolve => {
        const backdrop = document.createElement('div');
        backdrop.className = 'app-dialog-backdrop';
        backdrop.innerHTML = '<div class="app-dialog" role="dialog" aria-modal="true">' +
            '<div class="app-dialog-msg"></div>' +
            '<input type="text" autocomplete="off" />' +
            '<div class="app-dialog-buttons">' +
            '<button class="btn btn-dialog-cancel" type="button">Cancel</button>' +
            '<button class="btn btn-primary" type="button">OK</button>' +
            '</div></div>';
        const msgEl = backdrop.querySelector('.app-dialog-msg');
        const input = backdrop.querySelector('input');
        const [cancelBtn, okBtn] = backdrop.querySelectorAll('button');
        msgEl.textContent = msg;
        input.setAttribute('aria-label', msg);
        input.value = defaultValue;
        const close = (result) => {
            document.removeEventListener('keydown', onKey, true);
            backdrop.remove();
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(null); }
            else if (e.key === 'Enter') { e.preventDefault(); close(input.value); }
        };
        document.addEventListener('keydown', onKey, true);
        cancelBtn.addEventListener('click', () => close(null));
        okBtn.addEventListener('click', () => close(input.value));
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
        document.body.appendChild(backdrop);
        input.focus();
        input.select();
    });
}

async function showNewListInput() {
    const name = await appPrompt('New list name:');
    if (!name || !name.trim()) return;
    CARD_LISTS.push({ name: name.trim(), builtin: false, cards: [] });
    const newIndex = CARD_LISTS.length - 1;
    selectedListIndices.add(newIndex);
    expandedListIndices.add(newIndex);
    renderCardManager();
}

function deleteList(li) {
    if (CARD_LISTS[li].builtin) return;
    CARD_LISTS.splice(li, 1);
    // Rebuild index sets since indices shifted
    const rebuildSet = (s) => {
        const n = new Set();
        s.forEach(i => { if (i < li) n.add(i); else if (i > li) n.add(i - 1); });
        return n;
    };
    selectedListIndices = rebuildSet(selectedListIndices);
    expandedListIndices = rebuildSet(expandedListIndices);
    renderCardManager();
}

function addCardToList(li) {
    const leftInput = document.getElementById(`addLeft_${li}`);
    const rightInput = document.getElementById(`addRight_${li}`);
    const left = leftInput.value.trim();
    const right = rightInput.value.trim();
    if (!left || !right) return;
    CARD_LISTS[li].cards.push({ left, right });
    renderCardManager();
    // Re-focus the left input after re-render
    setTimeout(() => {
        const el = document.getElementById(`addLeft_${li}`);
        if (el) el.focus();
    }, 0);
}

function removeCardFromList(li, ci) {
    CARD_LISTS[li].cards.splice(ci, 1);
    renderCardManager();
}

// ================================================================
// CANVAS RENDERING
// ================================================================
function gameAngleToCanvas(gameDeg) {
    return Math.PI * (1 + gameDeg / 180);
}

function getAngleFromMouse(mx, my) {
    const dx = mx - dialGeo.cx;
    const dy = dialGeo.cy - my;
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle = dx < 0 ? Math.PI : 0;
    angle = Math.max(0, Math.min(Math.PI, angle));
    return 180 - (angle * 180 / Math.PI);
}

function drawDialBackground(ctx, cx, cy, r) {
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, gameAngleToCanvas(0), gameAngleToCanvas(180), false);
    ctx.closePath();
    ctx.fill();

    // 19 tick marks creating 20 sections (every 9°)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 20; i++) {
        const deg = i * 9;
        const rad = gameAngleToCanvas(deg);
        const inner = r * 0.90;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        ctx.stroke();
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, gameAngleToCanvas(0), gameAngleToCanvas(180), false);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();
}

function drawTargetZone(ctx, cx, cy, r, targetAngle, alpha) {
    if (alpha <= 0) return;

    const zones = [
        { halfWidth: ZONE_NEAR,     fillColor: `rgba(255, 200, 0, ${0.55 * alpha})`,   borderColor: `rgba(200, 160, 0, ${0.6 * alpha})`,   pts: 2 },
        { halfWidth: ZONE_CLOSE,    fillColor: `rgba(220, 50, 50, ${0.6 * alpha})`,     borderColor: `rgba(180, 30, 30, ${0.7 * alpha})`,    pts: 3 },
        { halfWidth: ZONE_BULLSEYE, fillColor: `rgba(50, 100, 240, ${0.7 * alpha})`,    borderColor: `rgba(30, 70, 200, ${0.8 * alpha})`,    pts: 4 },
    ];

    zones.forEach(zone => {
        const startDeg = Math.max(0, targetAngle - zone.halfWidth);
        const endDeg = Math.min(180, targetAngle + zone.halfWidth);
        ctx.fillStyle = zone.fillColor;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, gameAngleToCanvas(startDeg), gameAngleToCanvas(endDeg), false);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = zone.borderColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, gameAngleToCanvas(startDeg), gameAngleToCanvas(endDeg), false);
        ctx.stroke();
    });

    if (alpha > 0.4) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelR = r * 0.55;

        const label2Offset = (ZONE_NEAR + ZONE_CLOSE) / 2;
        [targetAngle - label2Offset, targetAngle + label2Offset].forEach(deg => {
            const clamped = Math.max(2, Math.min(178, deg));
            const rad = gameAngleToCanvas(clamped);
            ctx.font = `bold ${Math.round(r * 0.09)}px 'Segoe UI'`;
            ctx.fillStyle = `rgba(120, 90, 0, ${0.9 * alpha})`;
            ctx.fillText('2', cx + Math.cos(rad) * labelR, cy + Math.sin(rad) * labelR);
        });

        const label3Offset = (ZONE_CLOSE + ZONE_BULLSEYE) / 2;
        [targetAngle - label3Offset, targetAngle + label3Offset].forEach(deg => {
            const clamped = Math.max(2, Math.min(178, deg));
            const rad = gameAngleToCanvas(clamped);
            ctx.font = `bold ${Math.round(r * 0.09)}px 'Segoe UI'`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
            ctx.fillText('3', cx + Math.cos(rad) * labelR, cy + Math.sin(rad) * labelR);
        });

        const centerRad = gameAngleToCanvas(Math.max(2, Math.min(178, targetAngle)));
        ctx.font = `bold ${Math.round(r * 0.11)}px 'Segoe UI'`;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.fillText('4', cx + Math.cos(centerRad) * labelR, cy + Math.sin(centerRad) * labelR);
    }

    if (alpha > 0.5) {
        const centerRad = gameAngleToCanvas(targetAngle);
        ctx.strokeStyle = `rgba(30, 70, 200, ${0.8 * alpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(centerRad) * r, cy + Math.sin(centerRad) * r);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawPointer(ctx, cx, cy, r, angle) {
    const rad = gameAngleToCanvas(angle);
    const tipX = cx + Math.cos(rad) * r;
    const tipY = cy + Math.sin(rad) * r;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawCounterHighlight(ctx, cx, cy, r, guessAngle, side, isSelected, isHover) {
    let startDeg, endDeg;
    if (side === 'LEFT') {
        startDeg = 0;
        endDeg = guessAngle;
    } else {
        startDeg = guessAngle;
        endDeg = 180;
    }
    if (endDeg - startDeg < 1) return;

    // Fill highlight
    if (isSelected) {
        ctx.fillStyle = 'rgba(255, 190, 30, 0.4)';
    } else if (isHover) {
        ctx.fillStyle = 'rgba(180, 200, 255, 0.3)';
    }
    if (isSelected || isHover) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, gameAngleToCanvas(startDeg), gameAngleToCanvas(endDeg), false);
        ctx.closePath();
        ctx.fill();

        // Border on the highlighted area
        ctx.strokeStyle = isSelected ? 'rgba(255, 190, 30, 0.7)' : 'rgba(180, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 1, gameAngleToCanvas(startDeg), gameAngleToCanvas(endDeg), false);
        ctx.stroke();
    }
}

function drawCounterLabels(ctx, cx, cy, r, guessAngle, selectedSide, hoverSide) {
    ['LEFT', 'RIGHT'].forEach(side => {
        const startDeg = side === 'LEFT' ? 0 : guessAngle;
        const endDeg = side === 'LEFT' ? guessAngle : 180;
        if (endDeg - startDeg < 3) return;

        const midDeg = (startDeg + endDeg) / 2;
        const labelRad = gameAngleToCanvas(Math.max(8, Math.min(172, midDeg)));
        const labelR = r * 0.5;
        const lx = cx + Math.cos(labelRad) * labelR;
        const ly = cy + Math.sin(labelRad) * labelR;

        const isActive = side === selectedSide;
        const isHover = !selectedSide && side === hoverSide;
        const fontSize = Math.round(r * 0.1);

        // Text with outline for readability
        ctx.font = `bold ${fontSize}px 'Segoe UI'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(side, lx, ly);

        // Fill
        if (isActive) {
            ctx.fillStyle = '#fff';
        } else if (isHover) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        }
        ctx.fillText(side, lx, ly);
    });
}

function drawRevealCover(ctx, cx, cy, r, progress) {
    if (progress >= 1) return;
    const eased = 1 - Math.pow(1 - progress, 3);
    const revealStart = gameState.round.targetAngle - eased * 180;
    const revealEnd = gameState.round.targetAngle + eased * 180;
    const clampedStart = Math.max(0, revealStart);
    const clampedEnd = Math.min(180, revealEnd);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r + 5, gameAngleToCanvas(0), gameAngleToCanvas(180), false);
    ctx.closePath();
    ctx.fillStyle = `rgba(26, 26, 46, ${0.95 * (1 - eased * 0.3)})`;
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r + 10, gameAngleToCanvas(clampedStart), gameAngleToCanvas(clampedEnd), false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();
    ctx.restore();
}

function drawScorePopups(ctx) {
    const now = performance.now();
    scorePopups = scorePopups.filter(pop => {
        const elapsed = now - pop.startTime;
        if (elapsed < 0) return true;
        if (elapsed > pop.duration) return false;
        const progress = elapsed / pop.duration;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.font = `bold ${Math.round(22 * (1 + progress * 0.3))}px 'Segoe UI'`;
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Position from the current dial geometry, which can change if the canvas resizes mid-popup
        const x = dialGeo.cx + Math.cos(pop.angle) * dialGeo.radius * 0.6;
        const y = dialGeo.cy + Math.sin(pop.angle) * dialGeo.radius * 0.6;
        ctx.fillText(pop.text, x, y - progress * 50);
        ctx.restore();
        return true;
    });
}

function renderDial() {
    const canvas = document.getElementById('dialCanvas');
    const ctx = canvas.getContext('2d');
    const { cx, cy, radius } = dialGeo;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (radius <= 0) return;

    drawDialBackground(ctx, cx, cy, radius);

    // Target zone: visible during PEEK, CLUE_ENTRY, and REVEAL
    const showTarget = [GamePhase.CLUE_ENTRY, GamePhase.REVEAL].includes(gameState.phase);
    if (showTarget) {
        let alpha = 1;
        if (revealAnim.active) {
            const elapsed = performance.now() - revealAnim.startTime;
            alpha = Math.min(1, elapsed / revealAnim.duration);
            if (alpha >= 1) revealAnim.active = false;
        }
        drawTargetZone(ctx, cx, cy, radius, gameState.round.targetAngle, alpha);
    }

    if (revealAnim.active && gameState.phase === GamePhase.REVEAL) {
        const progress = Math.min(1, (performance.now() - revealAnim.startTime) / revealAnim.duration);
        drawRevealCover(ctx, cx, cy, radius, progress);
    }

    // Counter guess highlights (before pointer so pointer draws on top)
    if (gameState.phase === GamePhase.COUNTER_GUESS) {
        const gA = gameState.round.guessAngle;
        // Draw highlights
        if (counterSelectedSide) {
            drawCounterHighlight(ctx, cx, cy, radius, gA, counterSelectedSide, true, false);
        } else if (counterHoverSide) {
            drawCounterHighlight(ctx, cx, cy, radius, gA, counterHoverSide, false, true);
        }
        // Always draw both labels on top
        drawCounterLabels(ctx, cx, cy, radius, gA, counterSelectedSide, counterHoverSide);
    }

    // Pointer
    const showPointer = [GamePhase.GUESS_PHASE, GamePhase.COUNTER_GUESS, GamePhase.REVEAL].includes(gameState.phase);
    if (showPointer) {
        drawPointer(ctx, cx, cy, radius, gameState.round.guessAngle);
    }

    drawScorePopups(ctx);

    if (revealAnim.active || scorePopups.length > 0) {
        requestAnimationFrame(renderDial);
    }
}

// ================================================================
// CANVAS SIZING
// ================================================================
function resizeCanvas() {
    const canvas = document.getElementById('dialCanvas');
    const container = document.getElementById('dialContainer');
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.getContext('2d').scale(dpr, dpr);

    // Flat edge of the half-circle sits at cy, the arc rises to cy - radius, and the spectrum card
    // sits just under the flat edge. The dial + card group is centred in the space left over.
    const padTop = 12, padBottom = 8;
    const specH = h < 300 ? 40 : 52;
    // gap = 12px + the knob's radius (r * 0.08), so the knob never touches the card
    const maxRadiusByHeight = (h - padTop - padBottom - specH - 12) / 1.08;
    const maxRadiusByWidth = (w - 20) / 2;
    dialGeo.radius = Math.max(0, Math.min(maxRadiusByHeight, maxRadiusByWidth));
    const specGap = 12 + dialGeo.radius * 0.08;
    const groupH = dialGeo.radius + specGap + specH;
    const top = Math.max(padTop, (h - groupH) / 2);
    dialGeo.cy = top + dialGeo.radius;
    dialGeo.cx = w / 2;
    const spec = document.getElementById('specCard');
    if (spec) {
        const sw = Math.min(w - 16, Math.max(2 * dialGeo.radius + 16, Math.min(320, w - 16)));
        spec.style.setProperty('--spec-h', specH + 'px');
        spec.style.width = sw + 'px';
        spec.style.left = ((w - sw) / 2) + 'px';
        spec.style.top = (dialGeo.cy + specGap) + 'px';
    }
    renderDial();
}

// ================================================================
// EVENT HANDLING
// ================================================================
function getCanvasPos(e) {
    const canvas = document.getElementById('dialCanvas');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function isInDial(px, py) {
    const { cx, cy, radius } = dialGeo;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    return dist <= radius + 15 && py <= cy + 15;
}

function getSideOfPointer(px, py) {
    const angle = getAngleFromMouse(px, py);
    return angle < gameState.round.guessAngle ? 'LEFT' : 'RIGHT';
}

function handlePointerDown(e) {
    const pos = getCanvasPos(e);

    if (gameState.phase === GamePhase.GUESS_PHASE) {
        e.preventDefault();
        if (isInDial(pos.x, pos.y)) {
            isDragging = true;
            gameState.round.guessAngle = getAngleFromMouse(pos.x, pos.y);
            renderDial();
        }
    } else if (gameState.phase === GamePhase.COUNTER_GUESS) {
        e.preventDefault();
        if (isInDial(pos.x, pos.y)) {
            counterSelectedSide = getSideOfPointer(pos.x, pos.y);
            counterHoverSide = null;
            document.getElementById('counterSubmitBtn').style.display = 'inline-block';
            renderDial();
        }
    }
}

function handlePointerMove(e) {
    const pos = getCanvasPos(e);
    const canvas = document.getElementById('dialCanvas');

    if (gameState.phase === GamePhase.GUESS_PHASE) {
        if (isDragging) {
            e.preventDefault();
            gameState.round.guessAngle = getAngleFromMouse(pos.x, pos.y);
            renderDial();
        }
        canvas.style.cursor = isInDial(pos.x, pos.y) ? 'grab' : 'default';
    } else if (gameState.phase === GamePhase.COUNTER_GUESS) {
        if (isInDial(pos.x, pos.y)) {
            const newSide = getSideOfPointer(pos.x, pos.y);
            if (!counterSelectedSide && newSide !== counterHoverSide) {
                counterHoverSide = newSide;
                renderDial();
            }
            canvas.style.cursor = 'pointer';
        } else {
            if (counterHoverSide !== null) {
                counterHoverSide = null;
                renderDial();
            }
            canvas.style.cursor = 'default';
        }
    } else {
        canvas.style.cursor = 'default';
    }
}

function handlePointerUp() {
    isDragging = false;
}

function setupEventListeners() {
    const canvas = document.getElementById('dialCanvas');
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', (e) => {
        if (isDragging && gameState.phase === GamePhase.GUESS_PHASE) {
            e.preventDefault();
            const pos = getCanvasPos(e);
            gameState.round.guessAngle = getAngleFromMouse(pos.x, pos.y);
            renderDial();
        }
    }, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('resize', resizeCanvas);
    // Panels above the dial (clue entry, guess, reveal) change the container's height without a window resize
    if (window.ResizeObserver) new ResizeObserver(() => resizeCanvas()).observe(document.getElementById('dialContainer'));

    document.getElementById('psychicReadyBtn').addEventListener('click', () => setPhase(GamePhase.CLUE_ENTRY));
    document.getElementById('submitClueBtn').addEventListener('click', submitClue);
    document.getElementById('lockGuessBtn').addEventListener('click', () => setPhase(GamePhase.COUNTER_GUESS));
    document.getElementById('counterSubmitBtn').addEventListener('click', () => {
        if (counterSelectedSide) {
            gameState.round.counterGuess = counterSelectedSide;
            setPhase(GamePhase.REVEAL);
        }
    });
    document.getElementById('nextRoundBtn').addEventListener('click', nextRound);
    document.getElementById('clueInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitClue();
    });
}

// ================================================================
// CARD & SCORING LOGIC
// ================================================================
function drawCard() {
    const available = SPECTRUM_CARDS.map((_, i) => i).filter(i => !gameState.usedCardIndices.includes(i));
    if (available.length === 0) { gameState.usedCardIndices = []; return drawCard(); }
    const idx = available[Math.floor(Math.random() * available.length)];
    gameState.usedCardIndices.push(idx);
    return SPECTRUM_CARDS[idx];
}

function generateTargetAngle() {
    // Snap to section centers (multiples of 9°, offset by 4.5°)
    // so the target zones align cleanly with the grid.
    // Need ±22.5° to fit, so center must be in [22.5, 157.5].
    // Section centers: 4.5, 13.5, 22.5, ..., 175.5
    // Valid: 22.5 to 157.5 → indices 2 to 17 (of 0-19)
    const idx = Math.floor(Math.random() * 16) + 2; // 2..17
    return idx * 9 + 4.5;
}

function calculateScore(targetAngle, guessAngle) {
    const diff = Math.abs(targetAngle - guessAngle);
    if (diff <= ZONE_BULLSEYE) return 4;
    if (diff <= ZONE_CLOSE) return 3;
    if (diff <= ZONE_NEAR) return 2;
    return 0;
}

function getScoreLabel(points) {
    if (points === 4) return { text: 'Bullseye! (4 pts)', cls: 'bullseye' };
    if (points === 3) return { text: 'Close! (3 pts)', cls: 'close' };
    if (points === 2) return { text: 'Near (2 pts)', cls: 'near' };
    return { text: 'Miss (0 pts)', cls: 'miss' };
}

function resolveRound() {
    const { targetAngle, guessAngle, counterGuess } = gameState.round;
    const activeTeamPoints = calculateScore(targetAngle, guessAngle);
    const opposingTeamIndex = 1 - gameState.activeTeamIndex;
    let counterCorrect = false;
    if (counterGuess && activeTeamPoints < 4) {
        const targetIsRight = targetAngle > guessAngle;
        counterCorrect = (counterGuess === 'RIGHT' && targetIsRight) || (counterGuess === 'LEFT' && !targetIsRight);
    }
    gameState.round.pointsAwarded = { activeTeam: activeTeamPoints, opposingTeam: counterCorrect ? 1 : 0 };
    gameState.teams[gameState.activeTeamIndex].score += activeTeamPoints;
    gameState.teams[opposingTeamIndex].score += (counterCorrect ? 1 : 0);
    gameState.roundHistory.push({ ...gameState.round });
    return gameState.round.pointsAwarded;
}

function getCurrentHinter() {
    const team = gameState.teams[gameState.activeTeamIndex];
    return team.players[team.hinterIndex];
}

function advanceHinter(teamIndex) {
    const team = gameState.teams[teamIndex];
    team.hinterIndex = (team.hinterIndex + 1) % team.players.length;
}

// ================================================================
// PHASE MANAGEMENT
// ================================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showPanel(panelId) {
    document.querySelectorAll('.phase-panel').forEach(p => p.style.display = 'none');
    if (panelId) document.getElementById(panelId).style.display = 'flex';
}

function showClueBar(show) {
    document.getElementById('clueBar').style.display = show ? 'block' : 'none';
}

function hidePrepOverlay() {
    document.getElementById('psychicPrepOverlay').classList.remove('active');
}

function updateScoreboard() {
    const t1 = gameState.teams[0];
    const t2 = gameState.teams[1];
    document.getElementById('team1ScoreDisplay').textContent = `${t1.name}: ${t1.score}`;
    document.getElementById('team2ScoreDisplay').textContent = `${t2.name}: ${t2.score}`;
    const hinter = getCurrentHinter();
    const team = gameState.teams[gameState.activeTeamIndex];
    document.getElementById('roundInfo').innerHTML =
        `<div>Round ${gameState.roundNumber}</div><div class="hinter-info" style="color:${team.color}">${escapeHtml(hinter)} is hinting</div>`;
}

function updateSpectrumLabels() {
    const card = gameState.round.spectrumCard;
    if (!card) return;
    document.getElementById('spectrumLeft').textContent = card.left;
    document.getElementById('spectrumRight').textContent = card.right;
    document.getElementById('specCard').classList.add('on');
}

// ================================================================
// SHEETS
// ================================================================
function openSheet(id) {
    document.getElementById(id).classList.add('open');
}
function closeSheet(id) {
    document.getElementById(id).classList.remove('open');
}
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.querySelector('.app-dialog-backdrop')) return;
    const open = [...document.querySelectorAll('.sheet-backdrop.open')].pop();
    if (open) closeSheet(open.id);
});

function updateCardsButton() {
    let n = 0;
    selectedListIndices.forEach(i => { n += CARD_LISTS[i].cards.length; });
    const lists = selectedListIndices.size;
    document.getElementById('cardsBtnCount').textContent = lists === 1 ? `${n}` : `${lists} lists · ${n}`;
}

function setPhase(newPhase) {
    gameState.phase = newPhase;

    switch (newPhase) {
        case GamePhase.MENU:
            showScreen('menuScreen');
            return;

        case GamePhase.PSYCHIC_PREP: {
            showScreen('gameScreen');
            updateScoreboard();
            updateSpectrumLabels();
            showClueBar(false);
            showPanel(null);
            const team = gameState.teams[gameState.activeTeamIndex];
            const hinter = getCurrentHinter();
            document.getElementById('psychicPrepTitle').textContent = `${team.name}'s Turn`;
            document.getElementById('psychicPrepTitle').style.color = team.color;
            document.getElementById('psychicPrepHinter').innerHTML = `<span style="color:${team.color}">${escapeHtml(hinter)}</span> is the Hinter`;
            document.getElementById('psychicPrepDesc').innerHTML = `<strong>${escapeHtml(hinter)}</strong> will see the target.<br>Everyone else, <strong>look away!</strong>`;
            document.getElementById('psychicPrepOverlay').classList.add('active');
            renderDial();
            break;
        }

        case GamePhase.CLUE_ENTRY: {
            hidePrepOverlay();
            gameState.round.revealed = true;
            const card = gameState.round.spectrumCard;
            const hinter = getCurrentHinter();
            document.getElementById('clueEntryTitle').textContent = `${hinter}, Enter Your Clue`;
            document.getElementById('spectrumReminder').innerHTML = `${escapeHtml(card.left)} <span class="arrow">&larr;&rarr;</span> ${escapeHtml(card.right)}`;
            document.getElementById('clueInput').value = '';
            showClueBar(false);
            showPanel('clueEntryPanel');
            setTimeout(() => document.getElementById('clueInput').focus(), 100);
            renderDial();
            break;
        }

        case GamePhase.GUESS_PHASE: {
            gameState.round.revealed = false; // hide target for guessers
            gameState.round.guessAngle = 90;
            const team = gameState.teams[gameState.activeTeamIndex];
            const hinter = getCurrentHinter();
            // Filter by position, not name, so a teammate who shares the hinter's name is still listed
            const teammates = team.players.filter((p, i) => i !== team.hinterIndex);
            document.getElementById('guessInstruction').innerHTML =
                `<strong style="color:${team.color}">${escapeHtml(teammates.join(', '))}</strong> — drag the pointer to guess`;
            document.getElementById('clueBarText').textContent = gameState.round.clue;
            showClueBar(true);
            showPanel('guessPanel');
            renderDial();
            break;
        }

        case GamePhase.COUNTER_GUESS: {
            const opposingTeam = gameState.teams[1 - gameState.activeTeamIndex];
            document.getElementById('counterTitle').innerHTML =
                `<span style="color:${opposingTeam.color}">${escapeHtml(opposingTeam.name)}</span> — click the side you think the target center is on`;
            counterHoverSide = null;
            counterSelectedSide = null;
            document.getElementById('counterSubmitBtn').style.display = 'none';
            showClueBar(true);
            showPanel('counterPanel');
            renderDial();
            break;
        }

        case GamePhase.REVEAL: {
            const points = resolveRound();
            gameState.round.revealed = true;
            revealAnim.active = true;
            revealAnim.startTime = performance.now();
            requestAnimationFrame(renderDial);

            const activeTeam = gameState.teams[gameState.activeTeamIndex];
            const opposingTeam = gameState.teams[1 - gameState.activeTeamIndex];
            const label = getScoreLabel(points.activeTeam);

            let html = `<div class="score-label ${label.cls}">${label.text}</div>`;
            html += `<div class="score-divider"></div>`;
            html += `<div class="score-row"><span style="color:${activeTeam.color}">${escapeHtml(activeTeam.name)}</span><span class="points ${points.activeTeam > 0 ? 'gold' : 'red'}">+${points.activeTeam}</span></div>`;
            html += `<div class="score-row"><span style="color:${opposingTeam.color}">${escapeHtml(opposingTeam.name)}</span><span class="points ${points.opposingTeam > 0 ? 'green' : 'red'}">+${points.opposingTeam}</span></div>`;
            document.getElementById('revealScoreCard').innerHTML = html;
            updateScoreboard();

            const targetRad = gameAngleToCanvas(gameState.round.targetAngle);
            if (points.activeTeam > 0) {
                scorePopups.push({ text: `+${points.activeTeam}`, angle: targetRad, color: '#ffd700', startTime: performance.now() + 800, duration: 1500 });
            }

            showClueBar(true);
            // Small delay so reveal animation plays before showing score
            showPanel(null);
            setTimeout(() => showPanel('revealPanel'), 900);
            break;
        }

        case GamePhase.GAME_OVER: {
            showScreen('gameOverScreen');
            // Both teams can pass the target in one round (guess points + counter point): the higher score wins
            const [t1, t2] = gameState.teams;
            const winner = t2.score > t1.score ? t2 : t1;
            document.getElementById('winnerTitle').textContent = `${winner.name} Wins!`;
            document.getElementById('winnerTitle').style.color = winner.color;
            let html = '';
            gameState.teams.forEach(team => {
                const isWinner = team === winner;
                html += `<div class="final-score-card ${isWinner ? 'winner' : ''}"><div class="team-name" style="color:${team.color}">${escapeHtml(team.name)}</div><div class="score-value" style="color:${team.color}">${team.score}</div></div>`;
            });
            document.getElementById('finalScores').innerHTML = html;
            break;
        }
    }
}

// ================================================================
// GAME ACTIONS
// ================================================================
function startGame() {
    const name1 = document.getElementById('team1NameInput').value.trim() || 'Team 1';
    const name2 = document.getElementById('team2NameInput').value.trim() || 'Team 2';
    const players1 = getPlayersFromList('team1Players');
    const players2 = getPlayersFromList('team2Players');
    if (players1.length < 2) { document.getElementById('menuError').textContent = `${name1} needs at least 2 players`; return; }
    if (players2.length < 2) { document.getElementById('menuError').textContent = `${name2} needs at least 2 players`; return; }

    // Build card pool from selected lists
    SPECTRUM_CARDS = [];
    selectedListIndices.forEach(i => SPECTRUM_CARDS.push(...CARD_LISTS[i].cards));
    if (SPECTRUM_CARDS.length < 3) {
        document.getElementById('menuError').textContent = 'Select card lists with at least 3 cards total';
        return;
    }
    document.getElementById('menuError').textContent = '';

    gameState.teams[0] = { name: name1, score: 0, color: '#00d9ff', players: players1, hinterIndex: Math.floor(Math.random() * players1.length) };
    gameState.teams[1] = { name: name2, score: 0, color: '#ff6b6b', players: players2, hinterIndex: Math.floor(Math.random() * players2.length) };
    gameState.activeTeamIndex = Math.random() < 0.5 ? 0 : 1;
    // Second team gets 1 bonus point for going second
    gameState.teams[1 - gameState.activeTeamIndex].score = 1;
    gameState.roundNumber = 1;
    gameState.usedCardIndices = [];
    gameState.roundHistory = [];
    gameState.targetScore = parseInt(document.getElementById('targetScoreSelect').value);

    gameState.round = { spectrumCard: drawCard(), targetAngle: generateTargetAngle(), hinterName: getCurrentHinter(), clue: '', guessAngle: 90, counterGuess: null, pointsAwarded: null, revealed: false };
    setPhase(GamePhase.PSYCHIC_PREP);
    resizeCanvas();
}

function submitClue() {
    const clue = document.getElementById('clueInput').value.trim();
    if (!clue) return;
    gameState.round.clue = clue;
    setPhase(GamePhase.GUESS_PHASE);
}

function nextRound() {
    if (gameState.teams.find(t => t.score >= gameState.targetScore)) { setPhase(GamePhase.GAME_OVER); return; }
    advanceHinter(gameState.activeTeamIndex);
    gameState.activeTeamIndex = 1 - gameState.activeTeamIndex;
    gameState.roundNumber++;
    gameState.round = { spectrumCard: drawCard(), targetAngle: generateTargetAngle(), hinterName: getCurrentHinter(), clue: '', guessAngle: 90, counterGuess: null, pointsAwarded: null, revealed: false };
    revealAnim.active = false;
    scorePopups = [];
    setPhase(GamePhase.PSYCHIC_PREP);
}

function goToMenu() {
    gameState.phase = GamePhase.MENU;
    showScreen('menuScreen');
}

// ================================================================
// INITIALIZATION
// ================================================================
function init() {
    setupEventListeners();
    resizeCanvas();
    renderCardManager();
    showScreen('menuScreen');
}

window.addEventListener('DOMContentLoaded', init);
