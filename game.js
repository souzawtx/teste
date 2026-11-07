/* ============================================
   LIGA DOS LEITORES — Motor do Jogo
   Canvas, movimento, colisão, câmera, mapa
   ============================================ */

const Game = {
    canvas: null,
    ctx: null,

    state: {
        username: '',
        appearance: null,
        currentWorld: 'overworld',
        playerPos: { x: 480, y: 720 }, // em pixels
        playerDir: 'down',
        xp: 0,
        coins: 0,
        hearts: 3,
        maxHearts: 3,
        completedMissions: [],
        activeMissions: [],
        inventory: [],
        visitedPortals: [],
        flags: {},
        stats: {
            missionsCorrect: 0,
            missionsWrong: 0,
            diagnosticTaken: false,
            diagnosticScore: null,
        }
    },

    camera: { x: 0, y: 0 },

    input: {
        up: false, down: false, left: false, right: false,
        interact: false
    },

    joystick: {
        active: false,
        touchId: null,
        startX: 0,
        startY: 0,
        knobX: 0,
        knobY: 0,
        vx: 0, vy: 0,
    },

    // Animação
    playerFrame: 0,
    animTime: 0,

    // Loop
    lastTime: 0,
    running: false,
    paused: false,

    nearbyObject: null,

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.bindInput();
        this.bindButtons();
    },

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    },

    bindInput() {
        // Teclado
        const keyMap = {
            'ArrowUp': 'up', 'w': 'up', 'W': 'up',
            'ArrowDown': 'down', 's': 'down', 'S': 'down',
            'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
            'ArrowRight': 'right', 'd': 'right', 'D': 'right',
        };

        // Nunca intercepta teclas enquanto a pessoa digita em um campo de texto
        const isTyping = (e) => {
            const t = e.target;
            if (!t || !t.tagName) return false;
            const tag = t.tagName.toUpperCase();
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
        };
        const gameActive = () => {
            const gs = document.getElementById('game-screen');
            return !!gs && gs.classList.contains('active');
        };

        document.addEventListener('keydown', (e) => {
            if (isTyping(e) || !gameActive()) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            // Escape sempre funciona para pausar/despausar
            if (e.key === 'Escape') {
                // Fechar modais abertos primeiro
                const missionModal = document.getElementById('mission-modal');
                const panelModal = document.getElementById('panel-modal');
                if (missionModal.classList.contains('visible')) {
                    missionModal.classList.remove('visible');
                    return;
                }
                if (panelModal.classList.contains('visible')) {
                    // Usa o fechamento centralizado para também retomar o jogo
                    // quando o painel aberto é a trilha de níveis.
                    UI.hidePanel();
                    return;
                }
                if (UI.isDialogActive()) {
                    UI.closeDialog();
                    return;
                }
                this.togglePause();
                e.preventDefault();
                return;
            }

            if (UI.isDialogActive() || this.paused) return;
            if (document.getElementById('mission-modal').classList.contains('visible')) return;
            if (document.getElementById('panel-modal').classList.contains('visible')) return;

            if (keyMap[e.key]) {
                this.input[keyMap[e.key]] = true;
                e.preventDefault();
            }
            if (e.key === 'e' || e.key === 'E') {
                this.tryInteract();
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (keyMap[e.key]) {
                this.input[keyMap[e.key]] = false;
            }
        });

        // Evita personagem "preso" andando quando a janela perde o foco
        const releaseKeys = () => {
            this.input.up = this.input.down = this.input.left = this.input.right = false;
        };
        window.addEventListener('blur', releaseKeys);
        document.addEventListener('visibilitychange', () => { if (document.hidden) releaseKeys(); });

        // Joystick touch
        const joystickArea = document.getElementById('joystick-area');
        const joystickKnob = document.getElementById('joystick-knob');

        const startJoystick = (e) => {
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const rect = joystickArea.getBoundingClientRect();
            this.joystick.active = true;
            this.joystick.touchId = e.touches ? touch.identifier : null;
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
            joystickArea.classList.add('active');
        };

        const moveJoystick = (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            const touch = e.touches ? Array.from(e.touches).find(t => t.identifier === this.joystick.touchId) || e.touches[0] : e;
            if (!touch) return;

            const dx = touch.clientX - this.joystick.startX;
            const dy = touch.clientY - this.joystick.startY;
            const maxDist = 50;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const clamped = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);
            const kx = Math.cos(angle) * clamped;
            const ky = Math.sin(angle) * clamped;

            joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
            this.joystick.vx = clamped > 10 ? Math.cos(angle) : 0;
            this.joystick.vy = clamped > 10 ? Math.sin(angle) : 0;
        };

        const endJoystick = (e) => {
            if (!this.joystick.active) return;
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.vx = 0;
            this.joystick.vy = 0;
            joystickArea.classList.remove('active');
            joystickKnob.style.transform = 'translate(-50%, -50%)';
        };

        joystickArea.addEventListener('touchstart', startJoystick, { passive: false });
        joystickArea.addEventListener('touchmove', moveJoystick, { passive: false });
        joystickArea.addEventListener('touchend', endJoystick, { passive: false });
        joystickArea.addEventListener('touchcancel', endJoystick, { passive: false });

        joystickArea.addEventListener('mousedown', startJoystick);
        window.addEventListener('mousemove', moveJoystick);
        window.addEventListener('mouseup', endJoystick);

        // Botão de interação touch
        document.getElementById('touch-interact').addEventListener('click', () => this.tryInteract());
    },

    bindButtons() {
        document.getElementById('btn-menu').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-inventory').addEventListener('click', () => {
            if (this.paused) UI.hidePauseMenu();
            UI.showInventory();
        });
        document.getElementById('btn-missions').addEventListener('click', () => {
            if (this.paused) UI.hidePauseMenu();
            UI.showMissionsJournal();
        });
    },

    start(gameState) {
        if (gameState) {
            this.state = { ...this.state, ...gameState };
        }
        const rules = Storage.getTeacherConfig().missionRules;
        this.state.maxHearts = Math.max(1, Math.min(5, Number(rules.startingHearts) || 3));
        this.state.hearts = Math.min(this.state.maxHearts, Number(this.state.hearts ?? this.state.maxHearts));
        this.state.stats ||= { missionsCorrect: 0, missionsWrong: 0 };
        this.state.stats.bySkill ||= {};

        // Validar posição inicial
        if (!this.state.playerPos) {
            const spawn = Worlds[this.state.currentWorld].spawn;
            this.state.playerPos = { x: spawn.x * Worlds.TILE_SIZE, y: spawn.y * Worlds.TILE_SIZE };
        }

        this.updateHUD();
        this.updateHudAvatar();

        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    },

    stop() {
        this.running = false;
    },

    togglePause() {
        this.paused = !this.paused;
        if (this.paused) UI.showPauseMenu();
        else UI.hidePauseMenu();
    },

    loop(time) {
        if (!this.running) return;
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (!this.paused) {
            this.update(dt);
        }
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    },

    update(dt) {
        if (UI.isDialogActive()) {
            // Pausa movimentação durante diálogos
            this.input.up = this.input.down = this.input.left = this.input.right = false;
        }

        const modalOpen = document.getElementById('mission-modal').classList.contains('visible')
            || document.getElementById('panel-modal').classList.contains('visible')
            || document.getElementById('reward-overlay').classList.contains('visible');

        if (!modalOpen) {
            this.updatePlayerMovement(dt);
        }

        this.updateCamera();
        this.checkNearbyObject();

        // animação andando
        this.animTime += dt;
        const moving = this.input.up || this.input.down || this.input.left || this.input.right
            || Math.abs(this.joystick.vx) > 0.1 || Math.abs(this.joystick.vy) > 0.1;
        if (moving) {
            if (this.animTime > 0.18) {
                this.animTime = 0;
                this.playerFrame = (this.playerFrame + 1) % 3;
            }
        } else {
            this.playerFrame = 0;
        }
    },

    updatePlayerMovement(dt) {
        const speed = 180; // px/s
        let vx = 0, vy = 0;

        if (this.input.up) vy -= 1;
        if (this.input.down) vy += 1;
        if (this.input.left) vx -= 1;
        if (this.input.right) vx += 1;

        if (this.joystick.vx !== 0 || this.joystick.vy !== 0) {
            vx += this.joystick.vx;
            vy += this.joystick.vy;
        }

        if (vx === 0 && vy === 0) return;

        // Normalizar diagonal
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag > 0) {
            vx /= mag;
            vy /= mag;
        }

        // Direção do sprite
        if (Math.abs(vx) > Math.abs(vy)) {
            this.state.playerDir = vx > 0 ? 'right' : 'left';
        } else {
            this.state.playerDir = vy > 0 ? 'down' : 'up';
        }

        const newX = this.state.playerPos.x + vx * speed * dt;
        const newY = this.state.playerPos.y + vy * speed * dt;

        // Colisão (checar em cada eixo independentemente para "sliding")
        if (!this.collidesAt(newX, this.state.playerPos.y)) {
            this.state.playerPos.x = newX;
        }
        if (!this.collidesAt(this.state.playerPos.x, newY)) {
            this.state.playerPos.y = newY;
        }

        // Marcar tiles visitados (para conquista)
        const ts = Worlds.TILE_SIZE;
        const tx = Math.floor(this.state.playerPos.x / ts);
        const ty = Math.floor(this.state.playerPos.y / ts);
        const visitKey = `${this.state.currentWorld}:${tx},${ty}`;
        if (!this.state.flags.visitedTileSet) this.state.flags.visitedTileSet = {};
        if (!this.state.flags.visitedTileSet[visitKey]) {
            this.state.flags.visitedTileSet[visitKey] = 1;
            this.state.flags.visitedTiles = (this.state.flags.visitedTiles || 0) + 1;
        }
    },

    collidesAt(px, py) {
        const ts = Worlds.TILE_SIZE;
        // Caixa de colisão do jogador (menor que o sprite)
        const halfW = 10;
        const halfH = 8;
        const left = px - halfW;
        const right = px + halfW;
        const top = py + 4; // pés do personagem
        const bottom = py + 20;

        const corners = [
            [left, top], [right, top],
            [left, bottom], [right, bottom],
        ];

        for (const [cx, cy] of corners) {
            const tx = Math.floor(cx / ts);
            const ty = Math.floor(cy / ts);

            if (tx < 0 || ty < 0) return true;
            const world = Worlds[this.state.currentWorld];
            if (tx >= world.map[0].length || ty >= world.map.length) return true;

            if (Worlds.isSolid(this.state.currentWorld, tx, ty)) {
                // Checar se é um objeto interagível
                const obj = Worlds.getObjectAt(this.state.currentWorld, tx, ty);
                if (obj && obj.type === 'door' && !obj.locked) continue;
                return true;
            }
        }
        return false;
    },

    updateCamera() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const world = Worlds[this.state.currentWorld];
        const ts = Worlds.TILE_SIZE;
        const mapW = world.map[0].length * ts;
        const mapH = world.map.length * ts;

        this.camera.x = this.state.playerPos.x - w / 2;
        this.camera.y = this.state.playerPos.y - h / 2;

        this.camera.x = Math.max(0, Math.min(this.camera.x, mapW - w));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapH - h));

        if (mapW < w) this.camera.x = (mapW - w) / 2;
        if (mapH < h) this.camera.y = (mapH - h) / 2;
    },

    checkNearbyObject() {
        const obj = Worlds.getNearbyObject(this.state.currentWorld, this.state.playerPos.x, this.state.playerPos.y, 50);
        this.nearbyObject = obj;
        if (obj) {
            const hintText = obj.type === 'portal' ? 'Atravessar' :
                             obj.type === 'npc' ? 'Falar' :
                             obj.type === 'door' ? (obj.locked ? 'Investigar' : 'Entrar') :
                             obj.type === 'sign' ? 'Ler' :
                             obj.type === 'building' ? 'Entrar' :
                             'Examinar';
            UI.showInteractionHint(hintText);
        } else {
            UI.hideInteractionHint();
        }
    },

    tryInteract() {
        if (UI.isDialogActive()) {
            UI.advanceDialog();
            return;
        }
        if (!this.nearbyObject) return;

        const obj = this.nearbyObject;

        // Localização visual quando chega perto
        document.getElementById('hud-location').textContent = obj.label || Worlds[this.state.currentWorld].name;

        if (obj.type === 'npc') {
            this.interactNPC(obj);
        } else if (obj.type === 'portal') {
            this.interactPortal(obj);
        } else if (obj.type === 'door') {
            this.interactDoor(obj);
        } else if (obj.type === 'sign') {
            UI.showDialog('Placa', [obj.text], '🪧');
        } else if (obj.type === 'building') {
            if (obj.action === 'library') UI.showLibrary();
            else if (obj.action === 'achievements') UI.showAchievements();
            else if (obj.action === 'shop') UI.showMarket();
            else UI.showDialog(obj.label, [obj.description || 'Esta área está em preparação.'], obj.icon || '🏛️');
        } else if (obj.type === 'interactive' || obj.type === 'landmark') {
            // Contar objetos examinados
            if (obj.missionTag && !this.state.flags[obj.missionTag]) {
                this.state.flags[obj.missionTag] = true;
                this.state.flags.examinedObjects = (this.state.flags.examinedObjects || 0) + 1;
            }
            UI.showDialog(obj.label, obj.dialog || [obj.description], obj.icon || '✨');
        }

        this.saveProgress();
    },

    interactNPC(npc) {
        UI.showDialog(npc.name, npc.dialog, npc.portrait, () => {
            // Oferecer missão vinculada
            if (npc.missionId) {
                const mission = Missions.get(npc.missionId);
                if (!mission) return;
                if (this.state.completedMissions.includes(mission.id)) {
                    UI.toast('Você já completou esta missão!', 'info', '✨');
                    return;
                }
                if (!Missions.canStart(mission, this.state.completedMissions)) {
                    UI.showDialog(npc.name, ['Antes de iniciar este desafio, complete as missões anteriores.'], npc.portrait);
                    return;
                }
                this.startMission(mission);
            }
        });
    },

    interactPortal(portal) {
        if (portal.locked) {
            UI.showDialog(portal.label, [portal.description || 'Este portal está bloqueado.'], portal.icon || '🚫');
            return;
        }
        if (!portal.destination) {
            UI.toast('Portal sem destino definido', 'error', '⚠️');
            return;
        }
        this.transitionToWorld(portal.destination);
    },

    interactDoor(door) {
        if (door.locked) {
            // Verifica se missões necessárias foram completas
            if (door.missionTag === 'main_mission') {
                const allDone = ['mission_1', 'mission_2', 'mission_3'].every(m => this.state.completedMissions.includes(m));
                if (allDone) {
                    UI.showDialog(door.label, ['A porta se abre em um brilho dourado!', 'Você solucionou o enigma e desvendou os segredos de A Metamorfose.', 'Volte à Praça para desbloquear novos mundos no futuro!'], '✨');
                    door.locked = false;
                    this.giveReward({
                        xp: 150,
                        coins: 80,
                        achievement: 'metamorphosis'
                    });
                    return;
                }
            }
            UI.showDialog(door.label, door.dialog || ['Esta porta está trancada. Complete as missões para desbloqueá-la.'], '🔒');
            return;
        }
        if (door.destination) {
            this.transitionToWorld(door.destination);
        } else {
            UI.showDialog(door.label, door.dialog || ['A porta não leva a lugar nenhum ainda.'], '🚪');
        }
    },

    transitionToWorld(worldId) {
        if (!Worlds[worldId]) {
            UI.toast('Mundo não encontrado', 'error', '⚠️');
            return;
        }

        // Fade out
        const canvas = this.canvas;
        canvas.style.transition = 'opacity 0.4s';
        canvas.style.opacity = '0.3';

        setTimeout(() => {
            this.state.currentWorld = worldId;
            const spawn = Worlds[worldId].spawn;
            const ts = Worlds.TILE_SIZE;
            this.state.playerPos = { x: spawn.x * ts + ts / 2, y: spawn.y * ts + ts / 2 };
            this.state.playerDir = 'down';

            if (!this.state.visitedPortals.includes(worldId)) {
                this.state.visitedPortals.push(worldId);
            }

            document.getElementById('hud-location').textContent = Worlds[worldId].name;

            // Narrativa de entrada se primeiro mundo
            if (worldId === 'metamorphosis' && !this.state.flags.enteredMetamorphosis) {
                this.state.flags.enteredMetamorphosis = true;
                setTimeout(() => {
                    UI.showDialog('???', [
                        'Você atravessa o portal e surge em um ambiente escuro e silencioso...',
                        'Está em uma casa antiga, com cheiro de madeira velha e cera.',
                        'Dois quartos ladeiam o cômodo principal. Algo estranho pairou no ar aqui.',
                        'Explore, examine os cômodos e converse com os moradores. Suas pistas estão nos detalhes.'
                    ], '👻');
                }, 500);
            }

            canvas.style.opacity = '1';
            this.saveProgress();
            UI.toast(`Chegou em: ${Worlds[worldId].name}`, 'info', '🗺️');
        }, 400);
    },

    startMission(mission) {
        const rules = Storage.getTeacherConfig().missionRules;
        this.state.maxHearts = Math.max(1, Math.min(5, Number(rules.startingHearts) || 3));
        this.state.hearts = this.state.maxHearts;
        this.currentMissionSkill = mission.skill || 'interpretacao';
        this.updateHUD();
        this.saveProgress();
        this.state.activeMissions = this.state.activeMissions.filter(id => id !== mission.id);
        this.state.activeMissions.push(mission.id);

        Storage.appendActivity(this.state.username, {
            type: 'mission_start',
            missionId: mission.id,
            missionTitle: mission.title
        });

        UI.showMission(mission, (result) => {
            if (result.success) {
                this.completeMission(mission, result);
            } else if (result.partial) {
                this.loseHeart();
                this.state.stats.missionsWrong++;
                const skill = this.currentMissionSkill || 'interpretacao';
                this.state.stats.bySkill ||= {};
                this.state.stats.bySkill[skill] ||= { correct: 0, wrong: 0 };
                this.state.stats.bySkill[skill].wrong++;
                this.state.flags.retries = (this.state.flags.retries || 0) + 1;
                Storage.appendActivity(this.state.username, {
                    type: 'mission_wrong',
                    missionId: mission.id
                });
            }
        });
    },

    completeMission(mission, result) {
        if (this.state.completedMissions.includes(mission.id)) return;

        this.state.completedMissions.push(mission.id);
        this.state.activeMissions = (this.state.activeMissions || []).filter(id => id !== mission.id);
        this.state.stats.missionsCorrect++;
        const skill = mission.skill || 'interpretacao';
        this.state.stats.bySkill ||= {};
        this.state.stats.bySkill[skill] ||= { correct: 0, wrong: 0 };
        this.state.stats.bySkill[skill].correct++;
        const prevLevel = Characters.getLevelInfo(this.state.xp).level;

        const baseXp = Math.max(5, Number(mission.xpReward) || Number(Storage.getTeacherConfig().missionRules.xpPerQuestion) || 20);
        const xpGain = result.usedHint ? Math.floor(baseXp * 0.7) : baseXp;
        this.state.xp += xpGain;
        this.state.coins += mission.coinReward;

        const newLevel = Characters.getLevelInfo(this.state.xp).level;
        const leveledUp = newLevel > prevLevel;

        Storage.appendActivity(this.state.username, {
            type: 'mission_complete',
            missionId: mission.id,
            missionTitle: mission.title,
            xpGained: xpGain,
            coinsGained: mission.coinReward,
            usedHint: result.usedHint
        });

        this.updateHUD();
        this.saveProgress();

        // Mostrar recompensa
        const stats = [
            { label: 'XP', value: `+${xpGain}` },
            { label: 'Moedas', value: `+${mission.coinReward}` },
        ];
        if (leveledUp) {
            stats.push({ label: 'Novo nível', value: Characters.getLevelInfo(this.state.xp).name });
        }

        if (leveledUp) UI._pendingTrailAfterReward = true;
        UI.showReward(`${mission.title} Concluída!`, stats, '🏆');

        if (leveledUp) {
            setTimeout(() => UI.toast(`Subiu de nível! Agora é ${Characters.getLevelInfo(this.state.xp).name}`, 'success', '⭐'), 500);
        }
    },

    giveReward({ xp = 0, coins = 0, achievement = null }) {
        this.state.xp += xp;
        this.state.coins += coins;
        this.updateHUD();
        this.saveProgress();

        const stats = [];
        if (xp > 0) stats.push({ label: 'XP', value: `+${xp}` });
        if (coins > 0) stats.push({ label: 'Moedas', value: `+${coins}` });

        UI.showReward('Recompensa Especial!', stats, '✨');
    },

    loseHeart() {
        if (this.state.hearts <= 0) return true;
        this.state.hearts--;
        this.updateHUD();
        this.saveProgress();
        if (this.state.hearts === 0) {
            const allowAutomatic = Storage.getTeacherConfig().missionRules.allowHeartRecovery !== false;
            UI.toast('Seus corações acabaram. Revise o trecho para continuar.', 'error', '💔');
            if (allowAutomatic) {
                if (this._heartRecoveryTimer) clearTimeout(this._heartRecoveryTimer);
                this._heartRecoveryTimer = setTimeout(() => {
                    this.recoverHearts('Corações restaurados. Continue aprendendo!');
                }, 3000);
            }
            return true;
        }
        return false;
    },

    recoverHearts(message = 'Corações restaurados! Continue aprendendo.') {
        this.state.hearts = this.state.maxHearts;
        this.updateHUD();
        this.saveProgress();
        UI.toast(message, 'success', '❤️');
    },

    updateHUD() {
        const state = this.state;
        document.getElementById('hud-name').textContent = state.appearance?.name || state.username;

        const levelInfo = Characters.getLevelInfo(state.xp);
        document.getElementById('hud-level').textContent = `Nv.${levelInfo.level}`;
        document.getElementById('hud-title').textContent = levelInfo.name;

        const xpPct = levelInfo.neededXp > 0 ? (levelInfo.currentXp / levelInfo.neededXp) * 100 : 100;
        document.getElementById('hud-xp-fill').style.width = `${Math.min(100, xpPct)}%`;
        document.getElementById('hud-xp-text').textContent =
            levelInfo.next ? `${levelInfo.currentXp} / ${levelInfo.neededXp} XP` : `${state.xp} XP`;

        document.getElementById('hud-coins').textContent = state.coins;

        // Corações
        const hearts = document.getElementById('hud-hearts');
        hearts.innerHTML = '';
        for (let i = 0; i < state.maxHearts; i++) {
            const h = document.createElement('span');
            h.className = i < state.hearts ? 'heart' : 'heart lost';
            h.textContent = '♥';
            hearts.appendChild(h);
        }

        document.getElementById('hud-location').textContent = Worlds[state.currentWorld]?.name || '';
    },

    updateHudAvatar() {
        const canvas = document.getElementById('hud-avatar-canvas');
        Characters.drawPortrait(canvas, this.state.appearance, { showGround: false });
    },

    saveProgress() {
        Storage.saveGameState(this.state.username, this.state);
    },

    // ====================================================
    // RENDERIZAÇÃO
    // ====================================================

    render() {
        const ctx = this.ctx;
        const w = window.innerWidth;
        const h = window.innerHeight;

        const world = Worlds[this.state.currentWorld];

        // Fundo
        ctx.fillStyle = world.background;
        ctx.fillRect(0, 0, w, h);

        this.renderMap();
        this.renderObjects();
        this.renderPlayer();
        this.renderAtmosphere();
        this.renderOverlay();
    },

    renderMap() {
        const ctx = this.ctx;
        const world = Worlds[this.state.currentWorld];
        const ts = Worlds.TILE_SIZE;

        // Range visível
        const startX = Math.max(0, Math.floor(this.camera.x / ts));
        const startY = Math.max(0, Math.floor(this.camera.y / ts));
        const endX = Math.min(world.map[0].length, Math.ceil((this.camera.x + window.innerWidth) / ts) + 1);
        const endY = Math.min(world.map.length, Math.ceil((this.camera.y + window.innerHeight) / ts) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = world.map[y][x];
                const px = x * ts - this.camera.x;
                const py = y * ts - this.camera.y;
                this.drawTile(ctx, tile, px, py, ts, x, y);
            }
        }
    },

    drawTile(ctx, tile, px, py, ts, tx, ty) {
        const isDungeon = this.state.currentWorld === 'metamorphosis';

        // Base
        if (isDungeon) {
            // Chão escuro base
            ctx.fillStyle = '#1a0f08';
            ctx.fillRect(px, py, ts, ts);
        } else {
            // Grama externa
            const n = this._noise(tx, ty);
            ctx.fillStyle = `hsl(${98 + n * 8}, 38%, ${31 + n * 3.5}%)`;
            ctx.fillRect(px, py, ts, ts);
        }

        switch (tile) {
            case '.':
                if (isDungeon) {
                    // Fundo escuro
                    ctx.fillStyle = '#2a1810';
                    ctx.fillRect(px, py, ts, ts);
                    // Grid sutil
                    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                    ctx.strokeRect(px, py, ts, ts);
                } else {
                    // Já é grama
                    this._drawGrassDetails(ctx, px, py, ts, tx, ty);
                }
                break;

            case ',':
                this._drawGrassDetails(ctx, px, py, ts, tx, ty);
                // Flor
                const colors = ['#ff6b9d', '#feca57', '#48dbfb', '#ff9ff3'];
                const colorIdx = (tx + ty * 3) % colors.length;
                ctx.fillStyle = colors[colorIdx];
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + ts / 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(px + ts / 2 - 1, py + ts / 2 - 1, 1, 0, Math.PI * 2);
                ctx.fill();
                break;

            case '-':
                // Caminho de terra
                {
                    const n = this._noise(tx + 40, ty + 40);
                    ctx.fillStyle = `hsl(32, 38%, ${38 + n * 5}%)`;
                    ctx.fillRect(px, py, ts, ts);
                    // Pedrinhas e grãos
                    for (let i = 0; i < 4; i++) {
                        const r = this._noise(tx * 3 + i, ty * 5 + i);
                        const r2 = this._noise(tx * 7 + i, ty * 2 + i);
                        ctx.fillStyle = i % 2 ? 'rgba(60,35,15,0.35)' : 'rgba(255,230,180,0.18)';
                        ctx.fillRect(px + r * (ts - 4), py + r2 * (ts - 4), 2 + (i % 2), 2);
                    }
                    // Borda suave contra a grama vizinha
                    const map = Worlds[this.state.currentWorld].map;
                    const nb = (x, y) => (map[y] && map[y][x]) || '.';
                    ctx.fillStyle = 'rgba(40,25,10,0.28)';
                    if (nb(tx, ty - 1) !== '-' && nb(tx, ty - 1) !== '=') ctx.fillRect(px, py, ts, 3);
                    if (nb(tx, ty + 1) !== '-' && nb(tx, ty + 1) !== '=') ctx.fillRect(px, py + ts - 3, ts, 3);
                    if (nb(tx - 1, ty) !== '-' && nb(tx - 1, ty) !== '=') ctx.fillRect(px, py, 3, ts);
                    if (nb(tx + 1, ty) !== '-' && nb(tx + 1, ty) !== '=') ctx.fillRect(px + ts - 3, py, 3, ts);
                }
                break;

            case '=':
                // Ponte de madeira
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#5c3317';
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(px, py + i * (ts / 5), ts, 2);
                }
                break;

            case 'T':
                // Árvore
                this._drawGrassDetails(ctx, px, py, ts, tx, ty);
                this._drawTree(ctx, px + ts / 2, py + ts / 2, ts);
                break;

            case 'B':
                // Arbusto
                this._drawGrassDetails(ctx, px, py, ts, tx, ty);
                this._drawBush(ctx, px + ts / 2, py + ts / 2, ts);
                break;

            case 'W':
                // Água
                ctx.fillStyle = '#2563eb';
                ctx.fillRect(px, py, ts, ts);
                // Reflexo
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                const wave = Math.sin(Date.now() / 500 + tx * 0.5 + ty * 0.3) * 2;
                ctx.fillRect(px + 4, py + ts / 2 + wave, ts - 8, 2);
                ctx.fillRect(px + 8, py + ts / 2 - 6 + wave, ts - 16, 1);
                break;

            case 'F':
                // Fonte
                ctx.fillStyle = '#4a7c3f';
                ctx.fillRect(px, py, ts, ts);
                this._drawFountain(ctx, px + ts / 2, py + ts / 2, ts);
                break;

            case 'S':
                // Pedra
                this._drawGrassDetails(ctx, px, py, ts, tx, ty);
                ctx.fillStyle = '#78716c';
                ctx.beginPath();
                ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.35, ts * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case '#':
                // Parede de pedra (exterior)
                ctx.fillStyle = '#78716c';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#57534e';
                ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
                // Blocos
                ctx.strokeStyle = '#44403c';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, ts / 2 - 2, ts / 2 - 2);
                ctx.strokeRect(px + ts / 2, py + ts / 2, ts / 2 - 2, ts / 2 - 2);
                break;

            case 'w':
                // Parede interior (madeira)
                ctx.fillStyle = '#5c3317';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#4a2c1a';
                ctx.fillRect(px, py, ts, 4);
                ctx.fillRect(px, py + ts - 4, ts, 4);
                ctx.strokeStyle = '#3a1f10';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(px, py + i * (ts / 3) + 10);
                    ctx.lineTo(px + ts, py + i * (ts / 3) + 10);
                    ctx.stroke();
                }
                break;

            case 'f':
                // Piso de madeira
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px, py, ts, ts);
                ctx.strokeStyle = '#5c3317';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + ts, py);
                ctx.moveTo(px, py + ts);
                ctx.lineTo(px + ts, py + ts);
                ctx.stroke();
                break;

            case 'd':
                // Porta
                ctx.fillStyle = '#5c3317';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px + 6, py + 4, ts - 12, ts - 8);
                ctx.fillStyle = '#f0c060';
                ctx.beginPath();
                ctx.arc(px + ts - 12, py + ts / 2, 2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'b':
                // Cama
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(px + 6, py + 6, ts - 12, 10);
                break;

            case 'm':
                // Móvel/mesa
                ctx.fillStyle = '#5c3317';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
                break;

            case 'k':
                // Livro no chão
                ctx.fillStyle = '#8b6a3f';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#7c3aed';
                ctx.fillRect(px + ts / 2 - 8, py + ts / 2 - 6, 16, 12);
                ctx.fillStyle = '#f0c060';
                ctx.fillRect(px + ts / 2 - 1, py + ts / 2 - 6, 2, 12);
                break;

            case 'p':
                // Quadro na parede
                ctx.fillStyle = '#5c3317';
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = '#f0c060';
                ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
                ctx.fillStyle = '#2a1a4a';
                ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
                break;
        }
    },

    // Ruído determinístico por tile (0..1) — evita padrão de xadrez
    _noise(x, y) {
        const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return v - Math.floor(v);
    },

    _drawGrassDetails(ctx, px, py, ts, tx, ty) {
        // Tufos de grama
        for (let i = 0; i < 3; i++) {
            const r = this._noise(tx * 5 + i, ty * 3 + i * 2);
            if (r < 0.45) continue;
            const gx = px + this._noise(tx + i, ty * 2) * (ts - 8) + 4;
            const gy = py + this._noise(tx * 2, ty + i) * (ts - 10) + 8;
            ctx.strokeStyle = r > 0.75 ? 'rgba(170,220,120,0.35)' : 'rgba(20,60,20,0.30)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(gx - 2, gy); ctx.lineTo(gx - 3, gy - 4);
            ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 5);
            ctx.moveTo(gx + 2, gy); ctx.lineTo(gx + 3, gy - 4);
            ctx.stroke();
        }
    },

    _drawTree(ctx, cx, cy, ts) {
        // Sombra no chão
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy + ts * 0.36, ts * 0.34, ts * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tronco
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(cx - 4, cy + 2, 8, ts * 0.3);
        ctx.fillStyle = '#7a4a24';
        ctx.fillRect(cx - 4, cy + 2, 3, ts * 0.3);
        // Copa em camadas (escura -> clara)
        const layers = [
            ['#24401a', 0, -2, 0.42],
            ['#2f5a24', -3, -6, 0.34],
            ['#3f7a30', 4, -8, 0.28],
            ['#5aa042', -2, -12, 0.2]
        ];
        for (const [c, ox, oy, r] of layers) {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(cx + ox, cy + oy, ts * r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Brilho
        ctx.fillStyle = 'rgba(255, 255, 220, 0.22)';
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 13, 4, 0, Math.PI * 2);
        ctx.fill();
        // Contorno e pequenas folhas iluminadas deixam a copa mais legível.
        ctx.strokeStyle = 'rgba(14, 35, 18, 0.42)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy - 3, ts * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(196, 235, 126, 0.30)';
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 11, 3, 0, Math.PI * 2);
        ctx.arc(cx - 13, cy - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawBush(ctx, cx, cy, ts) {
        ctx.fillStyle = '#2d4a1f';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.3, 0, Math.PI * 2);
        ctx.arc(cx - 6, cy + 2, ts * 0.25, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy + 2, ts * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a7c3f';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, ts * 0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawFountain(ctx, cx, cy, ts) {
        // Base
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Água
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // Pilar central
        ctx.fillStyle = '#78716c';
        ctx.fillRect(cx - 3, cy - ts * 0.4, 6, ts * 0.4);
        // Jato de água
        const wave = Math.sin(Date.now() / 300) * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy - ts * 0.4 + wave, 4, 0, Math.PI * 2);
        ctx.fill();
    },

    renderObjects() {
        const ctx = this.ctx;
        const world = Worlds[this.state.currentWorld];
        const ts = Worlds.TILE_SIZE;

        for (const obj of world.objects) {
            const px = obj.x * ts - this.camera.x;
            const py = obj.y * ts - this.camera.y;

            if (px < -ts || px > window.innerWidth || py < -ts || py > window.innerHeight) continue;

            if (obj.type === 'portal') {
                this.drawPortal(ctx, px, py, ts, obj);
            } else if (obj.type === 'npc') {
                this.drawNPC(ctx, px, py, ts, obj);
            } else if (obj.type === 'sign') {
                this.drawSign(ctx, px, py, ts);
            } else if (obj.type === 'building') {
                this.drawBuilding(ctx, px, py, ts, obj);
            } else if (obj.type === 'interactive' || obj.type === 'landmark') {
                this.drawInteractive(ctx, px, py, ts, obj);
            }

            // Marcador de interação
            if (obj === this.nearbyObject) {
                this.drawInteractIndicator(ctx, px + ts / 2, py - 10);
            }
        }
    },

    drawPortal(ctx, px, py, ts, portal) {
        const cx = px + ts / 2;
        const cy = py + ts / 2;
        const t = Date.now() / 1000;

        // Aura externa
        if (!portal.locked) {
            const auraR = ts * 0.6 + Math.sin(t * 2) * 4;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
            grad.addColorStop(0, portal.color + 'cc');
            grad.addColorStop(0.6, portal.color + '44');
            grad.addColorStop(1, portal.color + '00');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Portal (arco)
        ctx.fillStyle = portal.locked ? '#44403c' : '#1a0f2e';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.35, Math.PI, 2 * Math.PI);
        ctx.lineTo(cx + ts * 0.35, cy + ts * 0.3);
        ctx.lineTo(cx - ts * 0.35, cy + ts * 0.3);
        ctx.closePath();
        ctx.fill();

        if (!portal.locked) {
            // Partículas internas
            ctx.fillStyle = portal.color;
            for (let i = 0; i < 5; i++) {
                const angle = t * 2 + i * (Math.PI * 2 / 5);
                const r = ts * 0.2 + Math.sin(t * 3 + i) * 4;
                const px2 = cx + Math.cos(angle) * r;
                const py2 = cy + Math.sin(angle) * r - 4;
                ctx.beginPath();
                ctx.arc(px2, py2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Highlight no arco
            ctx.strokeStyle = portal.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, ts * 0.35, Math.PI, 2 * Math.PI);
            ctx.stroke();
        } else {
            // Cadeado
            ctx.fillStyle = '#f0c060';
            ctx.font = `${ts * 0.3}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔒', cx, cy);
        }

        // Pedestal
        ctx.fillStyle = '#57534e';
        ctx.fillRect(cx - ts * 0.35, cy + ts * 0.3, ts * 0.7, 8);
    },

    drawNPC(ctx, px, py, ts, npc) {
        const cx = px + ts / 2;
        const cy = py + ts / 2;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + ts * 0.3, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo
        const appearance = this._getNPCAppearance(npc.npcId);
        Characters.drawSprite(ctx, cx - 16, cy - 20, appearance, 'down', 0, 1);

        // Marcador de missão/interação (! acima)
        if (npc.missionId && !this.state.completedMissions.includes(npc.missionId)) {
            const t = Date.now() / 300;
            const yOffset = Math.sin(t) * 2;
            ctx.fillStyle = '#f0c060';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#1a0f2e';
            ctx.lineWidth = 3;
            ctx.strokeText('!', cx, cy - 32 + yOffset);
            ctx.fillText('!', cx, cy - 32 + yOffset);
        }

        // Nome
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(cx - 40, cy - 44, 80, 14);
        ctx.fillStyle = '#f0c060';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(npc.name, cx, cy - 37);
    },

    _npcAppearances: {},
    _getNPCAppearance(npcId) {
        if (this._npcAppearances[npcId]) return this._npcAppearances[npcId];
        const presets = {
            mentor: { gender: 'female', outfit: '#7c3aed', hair: '#d4a017', skin: '#f1c295', accessory: 'hat' },
            bard: { gender: 'male', outfit: '#059669', hair: '#8b4513', skin: '#d19968', accessory: 'none' },
            guard: { gender: 'male', outfit: '#dc2626', hair: '#2a1810', skin: '#a06d3f', accessory: 'hat' },
            narrator: { gender: 'female', outfit: '#4c1d95', hair: '#9333ea', skin: '#f1c295', accessory: 'hat' },
            grete: { gender: 'female', outfit: '#dc2626', hair: '#8b4513', skin: '#f1c295', accessory: 'none' },
            father: { gender: 'male', outfit: '#2a1810', hair: '#6a5c7d', skin: '#d19968', accessory: 'glasses' },
        };
        this._npcAppearances[npcId] = presets[npcId] || Characters.defaultAppearance('male');
        return this._npcAppearances[npcId];
    },

    drawSign(ctx, px, py, ts) {
        const cx = px + ts / 2;
        const cy = py + ts / 2;
        // Estaca
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(cx - 2, cy, 4, ts * 0.3);
        // Placa
        ctx.fillStyle = '#8b6a3f';
        ctx.fillRect(cx - 12, cy - 10, 24, 14);
        ctx.strokeStyle = '#5c3317';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 12, cy - 10, 24, 14);
        // Texto placeholder
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(cx - 8, cy - 7, 16, 1);
        ctx.fillRect(cx - 8, cy - 4, 12, 1);
        ctx.fillRect(cx - 8, cy - 1, 14, 1);
    },

    drawBuilding(ctx, px, py, ts, obj) {
        const cx = px + ts / 2;
        const cy = py + ts / 2;
        // Edifício ampliado (ocupa 1 tile mas é maior visual)
        ctx.fillStyle = '#78716c';
        ctx.fillRect(cx - ts * 0.5, cy - ts * 0.4, ts, ts * 0.7);
        // Telhado
        ctx.fillStyle = '#5c3317';
        ctx.beginPath();
        ctx.moveTo(cx - ts * 0.55, cy - ts * 0.4);
        ctx.lineTo(cx + ts * 0.55, cy - ts * 0.4);
        ctx.lineTo(cx, cy - ts * 0.75);
        ctx.closePath();
        ctx.fill();
        // Porta
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(cx - 8, cy + ts * 0.1, 16, ts * 0.2);
        // Ícone
        ctx.font = `${ts * 0.3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.icon, cx, cy - ts * 0.1);

        // Label
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(cx - 50, cy - ts * 0.9, 100, 14);
        ctx.fillStyle = '#f0c060';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(obj.label, cx, cy - ts * 0.9 + 7);
    },

    drawInteractive(ctx, px, py, ts, obj) {
        const cx = px + ts / 2;
        const cy = py + ts / 2;
        const t = Date.now() / 500;

        // Aura sutil
        ctx.fillStyle = 'rgba(240, 192, 96, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.3 + Math.sin(t) * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${ts * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.icon || '✨', cx, cy);
    },

    drawInteractIndicator(ctx, cx, cy) {
        const t = Date.now() / 300;
        const yOffset = Math.sin(t) * 3;

        ctx.save();
        ctx.translate(cx, cy + yOffset);

        // Fundo
        ctx.fillStyle = '#f0c060';
        ctx.strokeStyle = '#1a0f2e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Letra E
        ctx.fillStyle = '#1a0f2e';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', 0, 1);

        ctx.restore();
    },

    renderPlayer() {
        const px = this.state.playerPos.x - this.camera.x;
        const py = this.state.playerPos.y - this.camera.y;

        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(px, py + 15, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        Characters.drawSprite(
            ctx,
            px - 16,
            py - 20,
            this.state.appearance,
            this.state.playerDir,
            this.playerFrame,
            1
        );

        // Nome do jogador acima do personagem (aceita qualquer letra, acentos incluídos)
        const name = (this.state.appearance && this.state.appearance.name) || this.state.username || '';
        if (name) {
            const ctx = this.ctx;
            ctx.save();
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const w = Math.min(ctx.measureText(name).width + 14, 150);
            const ny = py - 42;
            ctx.fillStyle = 'rgba(26,15,46,0.75)';
            ctx.fillRect(px - w / 2, ny - 8, w, 16);
            ctx.strokeStyle = 'rgba(240,192,96,0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px - w / 2 + 0.5, ny - 7.5, w - 1, 15);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(name, px, ny, w - 8);
            ctx.restore();
        }
    },

    renderAtmosphere() {
        const ctx = this.ctx;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const now = performance.now() / 1000;
        const isDungeon = this.state.currentWorld === 'metamorphosis';

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Pequenos pontos de luz dão profundidade ao cenário sem interferir na jogabilidade.
        // A posição é determinística: os elementos não piscam aleatoriamente a cada quadro.
        const particleCount = isDungeon ? 13 : 18;
        for (let i = 0; i < particleCount; i++) {
            const seed = i * 73.17;
            const x = ((seed * 17.31 + now * (isDungeon ? 4 : 7) * (i % 2 ? 1 : -0.55)) % (w + 80) + (w + 80)) % (w + 80) - 40;
            const y = ((seed * 9.73 + Math.sin(now * 0.55 + i * 1.8) * 26 + now * (i % 3 + 1) * 2) % (h + 60) + (h + 60)) % (h + 60) - 30;
            const pulse = 0.35 + (Math.sin(now * 2.1 + i * 2.4) + 1) * 0.22;
            const radius = isDungeon ? 1.1 + (i % 3) * 0.45 : 1 + (i % 3) * 0.55;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = isDungeon ? '#d9b38c' : (i % 4 === 0 ? '#fff0a8' : '#c8f3a6');
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = isDungeon ? 8 : 10;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';

        // Luz ambiente e vinheta suave para concentrar o olhar no mundo.
        if (isDungeon) {
            const px = this.state.playerPos.x - this.camera.x;
            const py = this.state.playerPos.y - this.camera.y;
            const light = ctx.createRadialGradient(px, py, 26, px, py, Math.max(190, Math.min(w, h) * 0.48));
            light.addColorStop(0, 'rgba(255, 205, 145, 0.10)');
            light.addColorStop(0.58, 'rgba(255, 170, 105, 0.035)');
            light.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = light;
            ctx.fillRect(0, 0, w, h);
        } else {
            const daylight = ctx.createLinearGradient(0, 0, 0, h);
            daylight.addColorStop(0, 'rgba(255, 230, 165, 0.055)');
            daylight.addColorStop(0.42, 'rgba(255, 255, 255, 0)');
            daylight.addColorStop(1, 'rgba(12, 25, 17, 0.10)');
            ctx.fillStyle = daylight;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.restore();
    },

    renderOverlay() {
        // Vignette sutil no mundo escuro
        if (this.state.currentWorld === 'metamorphosis') {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const grad = this.ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, Math.max(w, h) / 1.2);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        }
    }
};

window.Game = Game;
