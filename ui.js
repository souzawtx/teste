/* ============================================
   LIGA DOS LEITORES — UI Interativa
   Diálogos, Modais, Painéis, Toasts
   ============================================ */

const UI = {
    init() {
        this.bindDialog();
        this.bindMissionModal();
        this.bindPauseMenu();
        this.bindPanelModal();
        this.bindRewardOverlay();
        this.bindLevelTrailButton();
        this.bindRankingButton();
    },

    // ====== TOASTS ======
    toast(message, type = 'default', icon = '', duration = 3000) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => el.remove(), duration);
    },

    // ====== DIÁLOGO ======
    _dialogState: {
        active: false,
        lines: [],
        currentLine: 0,
        charIndex: 0,
        typing: false,
        onComplete: null,
        name: '',
        portrait: '',
    },

    bindDialog() {
        const box = document.getElementById('dialog-box');
        box.addEventListener('click', () => this.advanceDialog());

        document.addEventListener('keydown', (e) => {
            if (!this._dialogState.active) return;
            const tag = (e.target && e.target.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.advanceDialog();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeDialog();
            }
        });
    },

    showDialog(name, lines, portrait = '🧙', onComplete = null) {
        const box = document.getElementById('dialog-box');
        const nameEl = document.getElementById('dialog-name');
        const portraitEl = document.getElementById('dialog-portrait');

        nameEl.textContent = name;
        portraitEl.innerHTML = portrait;

        this._dialogState = {
            active: true,
            lines: Array.isArray(lines) ? lines : [lines],
            currentLine: 0,
            charIndex: 0,
            typing: false,
            onComplete,
            name,
            portrait
        };

        box.classList.add('visible');
        this._typeLine();
    },

    _typeLine() {
        const state = this._dialogState;
        if (state.currentLine >= state.lines.length) {
            this.closeDialog();
            return;
        }

        const textEl = document.getElementById('dialog-text');
        const continueEl = document.getElementById('dialog-continue');
        const line = state.lines[state.currentLine];
        state.charIndex = 0;
        state.typing = true;
        textEl.textContent = '';
        continueEl.style.visibility = 'hidden';

        const typeNextChar = () => {
            if (!state.typing || !state.active) return;
            if (state.charIndex < line.length) {
                textEl.textContent += line[state.charIndex];
                state.charIndex++;
                setTimeout(typeNextChar, 18);
            } else {
                state.typing = false;
                continueEl.style.visibility = 'visible';
            }
        };
        typeNextChar();
    },

    advanceDialog() {
        const state = this._dialogState;
        if (!state.active) return;
        if (state.typing) {
            // Pular typing
            state.typing = false;
            const textEl = document.getElementById('dialog-text');
            const continueEl = document.getElementById('dialog-continue');
            textEl.textContent = state.lines[state.currentLine];
            continueEl.style.visibility = 'visible';
            return;
        }
        state.currentLine++;
        if (state.currentLine >= state.lines.length) {
            this.closeDialog();
        } else {
            this._typeLine();
        }
    },

    closeDialog() {
        const state = this._dialogState;
        const box = document.getElementById('dialog-box');
        box.classList.remove('visible');
        state.active = false;
        state.typing = false;
        if (state.onComplete) {
            setTimeout(() => state.onComplete(), 300);
        }
    },

    isDialogActive() {
        return this._dialogState.active;
    },

    // ====== MISSION MODAL ======
    bindMissionModal() {
        document.getElementById('mission-close').addEventListener('click', () => this.closeMission());
    },

    showMission(mission, onFinish = null) {
        const modal = document.getElementById('mission-modal');
        document.getElementById('mission-title').textContent = mission.title;
        document.getElementById('mission-badge').textContent = `Mundo: ${Worlds[mission.worldId].name}`;

        const body = document.getElementById('mission-body');
        body.innerHTML = `
            <p>${this.escapeHTML(mission.briefing)}</p>
            ${mission.excerpt ? `
                <div class="literary-excerpt">
                    ${this.escapeHTML(mission.excerpt.text)}
                    <span class="excerpt-source">— ${this.escapeHTML(mission.excerpt.source)}</span>
                </div>
            ` : ''}
            <div class="question-block">
                <div class="question-text">${this.escapeHTML(mission.question)}</div>
                <div class="question-options" id="question-options">
                    ${mission.options.map((opt, i) => `
                        <button class="question-option" data-index="${i}">
                            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                            <span>${this.escapeHTML(opt.text)}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="feedback-block" id="feedback-block"></div>
            </div>
        `;

        document.getElementById('mission-footer').innerHTML = `
            <button class="btn-secondary" id="mission-hint-btn">💡 Pedir dica</button>
            <button class="btn-ghost" id="mission-cancel-btn">Deixar para depois</button>
        `;

        this._missionState = { mission, onFinish, answered: false, usedHint: false };

        document.querySelectorAll('.question-option').forEach(btn => {
            btn.addEventListener('click', () => this._handleAnswer(parseInt(btn.dataset.index)));
        });

        document.getElementById('mission-hint-btn').addEventListener('click', () => this._showHint());
        document.getElementById('mission-cancel-btn').addEventListener('click', () => this.closeMission());

        modal.classList.add('visible');
    },

    _handleAnswer(index) {
        const state = this._missionState;
        if (state.answered) return;

        const mission = state.mission;
        const chosen = mission.options[index];
        const options = document.querySelectorAll('.question-option');

        options.forEach((opt, i) => {
            opt.disabled = true;
            if (i === index) opt.classList.add('chosen');
            if (mission.options[i].correct) opt.classList.add('correct');
            else if (i === index && !chosen.correct) opt.classList.add('incorrect');
        });

        const feedback = document.getElementById('feedback-block');
        if (chosen.correct) {
            feedback.className = 'feedback-block success visible';
            feedback.innerHTML = `
                <div class="feedback-title">✓ Resposta Correta!</div>
                ${this.escapeHTML(chosen.feedback)}
            `;
            state.answered = true;

            document.getElementById('mission-footer').innerHTML = `
                <button class="btn-primary" id="mission-complete-btn">Receber Recompensa ▸</button>
            `;
            document.getElementById('mission-complete-btn').addEventListener('click', () => {
                this.closeMission();
                if (state.onFinish) state.onFinish({ success: true, usedHint: state.usedHint });
            });
        } else {
            feedback.className = 'feedback-block error visible';
            feedback.innerHTML = `
                <div class="feedback-title">✗ Ainda não é essa!</div>
                ${this.escapeHTML(chosen.feedback)}
                <br><br>
                <em>Você perdeu um ❤. Reflita e tente novamente.</em>
            `;

            // Perdeu um coração; ao zerar, a recuperação segue a configuração da professora.
            if (state.onFinish) state.onFinish({ success: false, usedHint: state.usedHint, partial: true });
            const exhausted = Game.state.hearts <= 0;
            const manualRecovery = exhausted && Storage.getTeacherConfig().missionRules.allowHeartRecovery === false;
            const reenable = () => {
                options.forEach(opt => { opt.disabled = false; opt.classList.remove('correct', 'incorrect', 'chosen'); });
                feedback.className = 'feedback-block'; feedback.textContent = '';
            };
            if (manualRecovery) {
                feedback.innerHTML += '<br><br><em>Leia novamente o trecho com atenção. Depois, selecione “Recuperar corações e tentar novamente”.</em>';
                document.getElementById('mission-footer').innerHTML = '<button class="btn-primary" id="recover-hearts-btn">❤️ Recuperar corações e tentar novamente</button><button class="btn-ghost" id="mission-cancel-review">Deixar para depois</button>';
                document.getElementById('recover-hearts-btn').addEventListener('click', () => { Game.recoverHearts('Corações recuperados após a revisão do texto.'); reenable(); document.getElementById('mission-footer').innerHTML = '<button class="btn-secondary" id="mission-hint-btn">💡 Pedir dica</button><button class="btn-ghost" id="mission-cancel-btn">Deixar para depois</button>'; document.getElementById('mission-hint-btn').addEventListener('click', () => this._showHint()); document.getElementById('mission-cancel-btn').addEventListener('click', () => this.closeMission()); });
                document.getElementById('mission-cancel-review').addEventListener('click', () => this.closeMission());
            } else if (exhausted) {
                setTimeout(() => { if (Game.state.hearts > 0) reenable(); }, 3200);
            } else {
                setTimeout(reenable, 1500);
            }
        }
    },

    _showHint() {
        const state = this._missionState;
        if (state.usedHint) return;
        state.usedHint = true;

        const feedback = document.getElementById('feedback-block');
        feedback.className = 'feedback-block hint visible';
        feedback.innerHTML = `
            <div class="feedback-title">💡 Dica da Mestra</div>
            ${this.escapeHTML(state.mission.hint)}
        `;

        document.getElementById('mission-hint-btn').disabled = true;
        document.getElementById('mission-hint-btn').textContent = 'Dica usada';
    },

    closeMission() {
        document.getElementById('mission-modal').classList.remove('visible');
    },

    // ====== MENU DE PAUSA ======
    bindPauseMenu() {
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handlePauseAction(action);
            });
        });
    },

    showPauseMenu() {
        document.getElementById('pause-menu').classList.add('visible');
    },

    hidePauseMenu() {
        document.getElementById('pause-menu').classList.remove('visible');
        // Ao sair do menu (inclusive para abrir um painel), o jogo volta a responder
        if (window.Game) {
            Game.paused = false;
            Game.lastTime = performance.now();
            ['up', 'down', 'left', 'right'].forEach(k => Game.input[k] = false);
        }
    },

    handlePauseAction(action) {
        this.hidePauseMenu();
        switch (action) {
            case 'resume': break;
            case 'missions': this.showMissionsJournal(); break;
            case 'library': this.showLibrary(); break;
            case 'achievements': this.showAchievements(); break;
            case 'levels': this.showLevelTrail(); break;
            case 'ranking': this.showRanking(); break;
            case 'assessment': this.showAssessment('final'); break;
            case 'character': App.showCharacterCreation(App.currentUser.appearance); break;
            case 'save':
                Game.saveProgress();
                this.toast('Progresso salvo! Até a próxima aventura.', 'success', '💾');
                setTimeout(() => App.logout(), 1200);
                break;
        }
    },


    // ====== RANKING DA LIGA ======
    bindRankingButton() {
        const button = document.getElementById('btn-ranking');
        if (button) button.addEventListener('click', () => this.showRanking());
    },

    async showRanking() {
        let students = Storage.getAllStudents();
        try {
            const remoteStudents = await SyncApi.getRanking();
            if (Array.isArray(remoteStudents)) students = remoteStudents;
        } catch (error) {
            this.toast(`Não foi possível atualizar o ranking: ${error.message}`, 'error', '⚠️');
        }
        const currentUsername = App.currentUser?.username;
        const entries = students.map(student => {
            const gameState = student.gameState || {};
            const xp = Math.max(0, Number(gameState.xp) || 0);
            const completed = Array.isArray(gameState.completedMissions) ? gameState.completedMissions.length : 0;
            const correct = Math.max(0, Number(gameState.stats?.missionsCorrect) || 0);
            const wrong = Math.max(0, Number(gameState.stats?.missionsWrong) || 0);
            const attempts = correct + wrong;
            const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
            const appearance = gameState.appearance || student.appearance || Characters.defaultAppearance('female');
            return {
                username: student.username,
                name: appearance.name || student.username || 'Leitor',
                appearance,
                classCode: student.classCode || '',
                xp,
                completed,
                accuracy,
                levelInfo: Characters.getLevelInfo(xp),
                isCurrent: student.username === currentUsername,
            };
        });

        // Ranking por XP; em caso de empate, prioriza missões concluídas e depois precisão.
        entries.sort((a, b) => b.xp - a.xp || b.completed - a.completed || b.accuracy - a.accuracy || a.name.localeCompare(b.name, 'pt-BR'));

        if (!entries.length) {
            this.showPanel('🏆 Ranking da Liga', `
                <div class="ranking-empty">
                    <div class="ranking-empty-icon">📚</div>
                    <h4>Ainda não há leitores no ranking</h4>
                    <p>Quando estudantes criarem suas contas e começarem a completar missões, a classificação aparecerá aqui.</p>
                </div>
                <p class="ranking-note">O ranking é atualizado pelo servidor e reúne estudantes da mesma turma quando há código de turma cadastrado. O painel mostra apenas apelidos, avatares e progresso.</p>
            `);
            return;
        }

        const rankCards = entries.map((entry, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `<span class="ranking-place-number">${rank}</span>`;
            const cardClass = `${rank <= 3 ? `ranking-top-${rank}` : ''} ${entry.isCurrent ? 'ranking-current-user' : ''}`.trim();
            const levelName = entry.levelInfo.name;
            const classLabel = entry.classCode ? `<span class="ranking-class">Turma ${this.escapeHTML(entry.classCode)}</span>` : '';
            return `
                <article class="ranking-row ${cardClass}">
                    <div class="ranking-position" aria-label="Posição ${rank}">${medal}</div>
                    <div class="ranking-avatar"><canvas id="ranking-avatar-${index}" width="64" height="64" aria-label="Avatar de ${this.escapeHTML(entry.name)}"></canvas></div>
                    <div class="ranking-player-info">
                        <div class="ranking-player-name">${this.escapeHTML(entry.name)} ${entry.isCurrent ? '<span class="ranking-you">Você</span>' : ''}</div>
                        <div class="ranking-player-meta"><span>Nível ${entry.levelInfo.level} · ${this.escapeHTML(levelName)}</span>${classLabel}</div>
                    </div>
                    <div class="ranking-stats">
                        <strong>✨ ${entry.xp.toLocaleString('pt-BR')} XP</strong>
                        <span>📜 ${entry.completed} missão(ões)</span>
                    </div>
                </article>`;
        }).join('');

        const myRankIndex = entries.findIndex(entry => entry.isCurrent);
        const myRankSummary = myRankIndex >= 0 ? `
            <div class="ranking-my-position">
                <span>📍 Sua posição</span>
                <strong>${myRankIndex + 1}º de ${entries.length}</strong>
                <span>${entries[myRankIndex].xp.toLocaleString('pt-BR')} XP acumulados</span>
            </div>` : '';

        this.showPanel('🏆 Ranking da Liga', `
            <section class="ranking-intro">
                <div class="ranking-intro-icon">🏆</div>
                <div><h4>Os aventureiros da Liga</h4><p>Suba no ranking lendo, interpretando e concluindo missões literárias.</p></div>
            </section>
            ${myRankSummary}
            <div class="ranking-list">${rankCards}</div>
            <p class="ranking-note">A classificação considera XP acumulado; em caso de empate, prioriza missões concluídas e precisão. ${SyncApi.rankingScope === 'class' ? 'A lista reúne estudantes que informaram o mesmo código de turma.' : 'Como sua conta ainda não está associada a uma turma, somente seu perfil aparece. Peça à professora o código da turma.'}</p>
        `);

        entries.forEach((entry, index) => {
            const canvas = document.getElementById(`ranking-avatar-${index}`);
            if (canvas) Characters.drawPortrait(canvas, entry.appearance, { showGround: false });
        });
    },

    // ====== TRILHA DE NÍVEIS DO ESTUDANTE ======
    bindLevelTrailButton() {
        const button = document.getElementById('btn-level-trail');
        if (button) button.addEventListener('click', () => this.showLevelTrail());
    },

    showLevelTrail() {
        if (!window.Game || !Game.state) {
            this.toast('Entre na aventura para ver sua trilha de níveis.', 'default', '🛤️');
            return;
        }

        const state = Game.state;
        const xp = Math.max(0, Number(state.xp) || 0);
        const current = Characters.getLevelInfo(xp);
        const levels = Characters.LEVELS;
        const progressToNext = current.next && current.neededXp > 0
            ? Math.max(0, Math.min(100, (current.currentXp / current.neededXp) * 100))
            : 100;
        const trailFill = levels.length > 1
            ? ((current.level - 1) / (levels.length - 1)) * 100
            : 100;
        const xpToNext = current.next ? Math.max(0, current.next.xpRequired - xp) : 0;
        const appearance = state.appearance || App.currentUser?.appearance || Characters.defaultAppearance('female');

        const levelDescriptions = [
            'Sua jornada começa aqui. Explore a Praça da Liga.',
            'Você já conhece os caminhos. Continue explorando e lendo.',
            'Investigue pistas e encontre sentidos além do texto.',
            'Use suas descobertas para superar desafios mais complexos.',
            'Sua leitura está ficando mais profunda e estratégica.',
            'Você chegou ao topo da trilha: uma Lenda da Literatura!'
        ];

        const nodes = levels.map((level, index) => {
            const reached = current.level > level.level;
            const isCurrent = current.level === level.level;
            const status = reached ? 'completed' : (isCurrent ? 'current' : 'locked');
            const icon = reached ? '✓' : (isCurrent ? '★' : '🔒');
            const requirement = level.xpRequired === 0 ? 'Início da jornada' : `${level.xpRequired.toLocaleString('pt-BR')} XP acumulados`;
            const card = `
                <article class="trail-level ${status} ${index % 2 === 0 ? 'trail-left' : 'trail-right'}" aria-current="${isCurrent ? 'step' : 'false'}">
                    <div class="trail-card">
                        <div class="trail-card-top">
                            <span class="trail-level-number">NÍVEL ${level.level}</span>
                            <span class="trail-status-label">${reached ? 'Conquistado' : (isCurrent ? 'Você está aqui' : 'Próxima etapa')}</span>
                        </div>
                        <h4>${level.name}</h4>
                        <p>${levelDescriptions[index] || 'Continue sua jornada literária.'}</p>
                        <div class="trail-xp-requirement">${requirement}</div>
                        ${isCurrent && current.next ? `
                            <div class="trail-current-progress">
                                <div class="trail-progress-track"><span style="width:${progressToNext}%"></span></div>
                                <small>${xpToNext.toLocaleString('pt-BR')} XP para o próximo nível</small>
                            </div>` : ''}
                        ${isCurrent && !current.next ? '<div class="trail-max-badge">🏆 Nível máximo alcançado</div>' : ''}
                    </div>
                    <div class="trail-node" aria-hidden="true"><span>${icon}</span></div>
                </article>`;
            return card;
        }).join('');

        const html = `
            <section class="trail-overview">
                <div class="trail-avatar-frame"><canvas id="trail-avatar-canvas" width="100" height="100" aria-label="Avatar do estudante"></canvas></div>
                <div class="trail-overview-info">
                    <span class="trail-eyebrow">SUA JORNADA PESSOAL</span>
                    <h3>${this.escapeHTML(appearance.name || state.username || 'Aventureiro')}</h3>
                    <p>Você é <strong>${current.name}</strong> · Nível ${current.level} de ${levels.length}</p>
                    <div class="trail-total-xp">✨ ${xp.toLocaleString('pt-BR')} XP conquistados</div>
                </div>
            </section>
            <div class="trail-intro">
                <div><strong>O caminho do leitor</strong><p>Cada missão concluída aproxima você da próxima etapa.</p></div>
                <div class="trail-overall-badge">${current.level}/${levels.length}</div>
            </div>
            <div class="level-trail" style="--trail-fill:${trailFill}%">
                <div class="trail-road" aria-hidden="true"><span></span></div>
                ${nodes}
            </div>
            <p class="trail-footnote">Seu avatar, nível e XP ficam vinculados ao perfil com que você entrou. Continue lendo, explorando e resolvendo missões para avançar.</p>
        `;

        this._levelTrailOpen = true;
        if (window.Game) Game.paused = true;
        this.showPanel('🛤️ Minha Trilha de Níveis', html);
        const avatarCanvas = document.getElementById('trail-avatar-canvas');
        if (avatarCanvas) Characters.drawPortrait(avatarCanvas, appearance, { showGround: false });
    },

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    },

    // ====== PANEL MODAL (biblioteca, missões, conquistas, inventário) ======
    bindPanelModal() {
        document.getElementById('panel-close').addEventListener('click', () => this.hidePanel());
    },

    showPanel(title, content) {
        document.getElementById('panel-title').textContent = title;
        document.getElementById('panel-body').innerHTML = content;
        document.getElementById('panel-modal').classList.add('visible');
    },

    hidePanel() {
        document.getElementById('panel-modal').classList.remove('visible');
        if (this._assessmentOpen && window.Game) { this._assessmentOpen = false; Game.paused = false; Game.lastTime = performance.now(); }
        if (this._levelTrailOpen && window.Game) {
            this._levelTrailOpen = false;
            Game.paused = false;
            Game.lastTime = performance.now();
        }
    },

    showMissionsJournal() {
        const state = Game.state;
        const allMissions = Missions.getAll().sort((a, b) => a.order - b.order);
        let html = '<div class="mission-journal-list">';
        for (const m of allMissions) {
            const completed = state.completedMissions.includes(m.id);
            const canStart = Missions.canStart(m, state.completedMissions);
            const status = completed ? 'completed' : (canStart ? 'active' : 'locked');
            const statusLabel = completed ? 'Concluída' : (canStart ? 'Disponível' : 'Bloqueada');
            const icon = completed ? '✅' : (canStart ? '📜' : '🔒');
            html += `
                <div class="mission-journal-item ${status}">
                    <div class="journal-icon">${icon}</div>
                    <div class="journal-text">
                        <div class="journal-title">${this.escapeHTML(m.title)}</div>
                        <div class="journal-desc">${this.escapeHTML(m.briefing)}</div>
                        <small>${this.escapeHTML(Worlds[m.worldId]?.name || 'Mundo literário')} · ${m.xpReward} XP</small>
                    </div>
                    <div class="mission-journal-action">
                        <span class="journal-status ${status}">${statusLabel}</span>
                        ${canStart && !completed ? `<button class="btn-small" data-start-mission="${this.escapeHTML(m.id)}">Iniciar</button>` : ''}
                    </div>
                </div>`;
        }
        html += '</div>';
        if (!allMissions.length) html = '<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-title">Nenhuma missão disponível</div><div class="empty-state-text">A professora ainda não publicou desafios para este mundo.</div></div>';
        this.showPanel('📜 Diário de Missões', html);
        document.querySelectorAll('[data-start-mission]').forEach(button => button.addEventListener('click', () => {
            const mission = Missions.get(button.dataset.startMission);
            if (!mission) return;
            this.hidePanel();
            Game.startMission(mission);
        }));
    },

    showLibrary() {
        const books = [
            {
                title: 'A Metamorfose',
                author: 'Franz Kafka',
                icon: '🪲',
                color1: '#8b4513',
                color2: '#2a1810',
                description: 'Novela de 1915 sobre a transformação de Gregor Samsa em um inseto.',
                worldId: 'metamorphosis',
                unlocked: true,
            },
            {
                title: 'O Diário de Anne Frank',
                author: 'Anne Frank',
                icon: '📔',
                color1: '#d97706',
                color2: '#78350f',
                description: 'Relato autobiográfico de uma adolescente judia escondida durante a Segunda Guerra.',
                unlocked: false,
            },
            {
                title: 'Vidas Secas',
                author: 'Graciliano Ramos',
                icon: '🌵',
                color1: '#92400e',
                color2: '#451a03',
                description: 'Romance regionalista que retrata uma família de retirantes do sertão nordestino.',
                unlocked: false,
            },
            {
                title: 'Iracema',
                author: 'José de Alencar',
                icon: '🌳',
                color1: '#059669',
                color2: '#064e3b',
                description: 'Romance indianista que retrata o encontro cultural entre índios e portugueses.',
                unlocked: false,
            },
            {
                title: 'A Cartomante',
                author: 'Machado de Assis',
                icon: '🔮',
                color1: '#7c3aed',
                color2: '#4c1d95',
                description: 'Conto que explora amor, traição e misticismo com desfecho surpreendente.',
                unlocked: false,
            },
            {
                title: 'O Alienista',
                author: 'Machado de Assis',
                icon: '🧪',
                color1: '#dc2626',
                color2: '#7f1d1d',
                description: 'Novela que ironiza a razão, a ciência e a loucura através de um médico obsessivo.',
                unlocked: false,
            },
        ];

        const state = Game.state;
        let html = '<div class="library-grid">';
        for (const book of books) {
            const missionsInWorld = book.worldId ? Missions.getByWorld(book.worldId) : [];
            const completedInWorld = missionsInWorld.filter(m => state.completedMissions.includes(m.id)).length;
            const progress = missionsInWorld.length > 0 ? Math.round((completedInWorld / missionsInWorld.length) * 100) : 0;

            html += `
                <div class="book-card" style="${!book.unlocked ? 'opacity: 0.5;' : ''}">
                    <div class="book-spine" style="background: linear-gradient(135deg, ${book.color1}, ${book.color2});">
                        <div class="book-spine-icon">${book.unlocked ? book.icon : '🔒'}</div>
                    </div>
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">${book.author}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.4;">${book.description}</div>
                    ${book.unlocked ? `
                        <div class="book-progress">
                            <span>📜 ${completedInWorld}/${missionsInWorld.length} missões</span>
                            <div class="progress-bar-mini" style="flex:1;">
                                <div class="progress-bar-mini-fill" style="width:${progress}%"></div>
                            </div>
                        </div>
                    ` : '<div class="book-progress"><em>Em breve na Liga...</em></div>'}
                </div>
            `;
        }
        html += '</div>';

        this.showPanel('📚 Biblioteca da Liga', html);
    },

    showAchievements() {
        const state = Game.state;
        const achievements = [
            { id: 'first_mission', name: 'Primeira Missão', icon: '🎯', desc: 'Conclua sua primeira missão literária.', check: s => s.completedMissions.length >= 1 },
            { id: 'detective', name: 'Detetive Literário', icon: '🔍', desc: 'Explore pelo menos 5 objetos interativos.', check: s => (s.flags.examinedObjects || 0) >= 5 },
            { id: 'metamorphosis', name: 'Mestre da Metamorfose', icon: '🪲', desc: 'Complete todas as missões de "A Metamorfose".', check: s => ['mission_1', 'mission_2', 'mission_3'].every(m => s.completedMissions.includes(m)) },
            { id: 'coin_collector', name: 'Cofre de Moedas', icon: '💰', desc: 'Acumule 100 moedas ou mais.', check: s => s.coins >= 100 },
            { id: 'explorer', name: 'Explorador', icon: '🗺️', desc: 'Visite todos os cantos da Praça da Liga.', check: s => (s.flags.visitedTiles || 0) >= 50 },
            { id: 'persistent', name: 'Leitor Persistente', icon: '📖', desc: 'Nunca desista: tente novamente após errar.', check: s => (s.flags.retries || 0) >= 1 },
            { id: 'level_up', name: 'Nível Superior', icon: '⭐', desc: 'Alcance o nível de Explorador.', check: s => Characters.getLevelInfo(s.xp).level >= 2 },
            { id: 'legend', name: 'Lenda', icon: '👑', desc: 'Alcance o nível máximo: Lenda da Literatura.', check: s => Characters.getLevelInfo(s.xp).level >= 6 },
        ];

        let html = '<div class="achievement-grid">';
        for (const ach of achievements) {
            const earned = ach.check(state);
            html += `
                <div class="achievement ${earned ? 'earned' : 'locked'}">
                    <div class="achievement-icon">${earned ? ach.icon : '🔒'}</div>
                    <div class="achievement-name">${ach.name}</div>
                    <div class="achievement-desc">${ach.desc}</div>
                </div>
            `;
        }
        html += '</div>';

        this.showPanel('🏆 Conquistas', html);
    },

    showMarket() {
        const catalog = [
            { id: 'market_hat', name: 'Chapéu de explorador', icon: '🎩', price: 25, accessory: 'hat', description: 'Um clássico para quem investiga mundos.' },
            { id: 'market_glasses', name: 'Óculos de investigador', icon: '🥽', price: 30, accessory: 'glasses', description: 'Para observar cada pista com atenção.' },
            { id: 'market_backpack', name: 'Mochila de aventureiro', icon: '🎒', price: 35, accessory: 'backpack', description: 'Leve seus materiais de leitura na jornada.' },
            { id: 'market_outfit_green', name: 'Túnica da floresta', icon: '🧥', price: 40, outfit: '#059669', description: 'Uma nova cor para seu traje.' },
            { id: 'market_outfit_gold', name: 'Túnica dourada', icon: '✨', price: 50, outfit: '#d97706', description: 'Um traje digno de um mestre literário.' },
            { id: 'market_outfit_blue', name: 'Túnica do oceano', icon: '🌊', price: 40, outfit: '#2563eb', description: 'Uma nova cor para explorar os mundos.' }
        ];
        const owned = new Set((Game.state.inventory || []).map(item => item.id));
        const html = `
            <div class="market-summary"><span>🪙 Seu saldo</span><strong>${Game.state.coins} moedas</strong></div>
            <div class="shop-grid">${catalog.map(item => `
                <article class="shop-card">
                    <div class="shop-item-icon">${item.icon}</div>
                    <h4>${this.escapeHTML(item.name)}</h4>
                    <p>${this.escapeHTML(item.description)}</p>
                    <div class="shop-buy-row"><strong>🪙 ${item.price}</strong>
                    <button class="btn-small" data-buy-item="${item.id}" ${owned.has(item.id) ? 'disabled' : ''}>${owned.has(item.id) ? 'Adquirido' : 'Comprar'}</button></div>
                </article>`).join('')}</div>
            <p class="form-help">As moedas são virtuais e só podem ser conquistadas nas atividades da Liga. Os itens são cosméticos: não facilitam respostas nem dão vantagens acadêmicas.</p>
        `;
        this.showPanel('🛒 Mercado Literário', html);
        document.querySelectorAll('[data-buy-item]').forEach(button => button.addEventListener('click', () => {
            const item = catalog.find(entry => entry.id === button.dataset.buyItem);
            if (!item || owned.has(item.id)) return;
            if (Game.state.coins < item.price) { this.toast('Você ainda não tem moedas suficientes.', 'error', '🪙'); return; }
            Game.state.coins -= item.price;
            Game.state.inventory ||= [];
            Game.state.inventory.push({ ...item, purchasedAt: Date.now() });
            Game.saveProgress(); Game.updateHUD();
            this.toast(`${item.name} foi adicionado à mochila!`, 'success', '🎁');
            this.showMarket();
        }));
    },

    equipInventoryItem(itemId) {
        const item = (Game.state.inventory || []).find(entry => entry.id === itemId);
        if (!item) return;
        const appearance = { ...Game.state.appearance };
        if (item.accessory) appearance.accessory = item.accessory;
        if (item.outfit) appearance.outfit = item.outfit;
        Game.state.appearance = appearance;
        App.currentUser.appearance = appearance;
        Storage.saveUser(App.currentUser.username, { appearance });
        Game.updateHudAvatar(); Game.saveProgress();
        this.toast(`${item.name} equipado!`, 'success', '✨');
        this.showInventory();
    },

    showInventory() {
        const inventory = Game.state.inventory || [];
        let html = '';
        if (inventory.length === 0) {
            html = `<div class="empty-state"><div class="empty-state-icon">🎒</div><div class="empty-state-title">Mochila vazia</div><div class="empty-state-text">Visite o Mercado Literário e troque suas moedas por itens cosméticos.</div></div>`;
        } else {
            html = `<div class="inventory-grid">${inventory.map(item => `
                <div class="inv-slot filled"><span>${item.icon || '🎁'}</span><span class="inv-slot-name">${this.escapeHTML(item.name)}</span>
                <button class="btn-small" data-equip-item="${this.escapeHTML(item.id)}">Equipar</button></div>`).join('')}</div>`;
        }
        this.showPanel('🎒 Mochila do Aventureiro', html);
        document.querySelectorAll('[data-equip-item]').forEach(button => button.addEventListener('click', () => this.equipInventoryItem(button.dataset.equipItem)));
    },

    // Avaliação inicial e posterior com questões paralelas por habilidade.
    showAssessment(kind = 'initial') {
        if (!Game.state) return;
        if (kind === 'final' && !Game.state.stats?.diagnosticInitial) {
            this.toast('A avaliação inicial precisa ser realizada primeiro.', 'info', '📖');
            return this.showAssessment('initial');
        }
        if (kind === 'final' && Game.state.stats?.diagnosticFinal) {
            this.toast('A avaliação posterior já foi registrada nesta jornada.', 'info', '📊');
            return;
        }
        if (kind === 'final' && !(Game.state.completedMissions || []).length) {
            this.toast('Conclua ao menos uma missão antes da avaliação posterior.', 'info', '📜');
            return;
        }
        const isInitial = kind === 'initial';
        this._assessmentOpen = true;
        const questions = isInitial ? [
            { skill: 'literal', text: 'No pequeno texto: “Ao amanhecer, Clara guardou o livro na mochila e caminhou até a estação.” Onde Clara colocou o livro?', options: ['Na estante', 'Na mochila', 'Na estação'], correct: 1 },
            { skill: 'inferencial', text: '“Pedro olhou para o céu escuro, acelerou o passo e abriu o guarda-chuva.” O que é possível inferir?', options: ['Estava prestes a chover ou já chovia', 'Pedro queria passear', 'O dia estava muito quente'], correct: 0 },
            { skill: 'interpretacao', text: 'Na frase “A notícia caiu como uma pedra em seu coração”, a expressão destacada sugere:', options: ['Uma queda física', 'Um impacto emocional doloroso', 'Uma sensação de alegria'], correct: 1 },
            { skill: 'critica', text: 'Uma personagem afirma que “todos devem obedecer sem perguntar”. Qual atitude demonstra leitura crítica?', options: ['Aceitar a frase como verdade absoluta', 'Investigar quem se beneficia dessa regra e quais são suas consequências', 'Ignorar o contexto da fala'], correct: 1 }
        ] : [
            { skill: 'literal', text: 'No texto: “Antes de sair, Miguel apagou a luz, fechou a janela e deixou a chave sobre a mesa.” O que Miguel deixou sobre a mesa?', options: ['Um bilhete', 'A chave', 'Um livro'], correct: 1 },
            { skill: 'inferencial', text: '“Lia entrou na sala molhada, sacudiu o casaco e colocou os sapatos perto do aquecedor.” O que o leitor pode inferir?', options: ['Lia veio de um ambiente chuvoso ou molhado', 'Lia acabou de nadar no mar', 'Lia está se preparando para dormir'], correct: 0 },
            { skill: 'interpretacao', text: 'Na frase “O silêncio da casa gritava sua ausência”, o recurso expressivo indica:', options: ['Que a casa fazia barulho', 'Que a ausência era muito perceptível e significativa', 'Que alguém gritava dentro da casa'], correct: 1 },
            { skill: 'critica', text: 'Em uma narrativa, o narrador descreve um personagem como preguiçoso, mas mostra que ele trabalha o dia inteiro em condições injustas. O que o leitor deve fazer?', options: ['Repetir o julgamento do narrador sem questionar', 'Comparar o julgamento com os fatos narrados e avaliar possíveis contradições', 'Desconsiderar todas as ações do personagem'], correct: 1 }
        ];
        const label = isInitial ? 'Avaliação inicial de leitura' : 'Avaliação posterior de leitura';
        const html = `
            <div class="assessment-intro"><p>${isInitial ? 'Esta atividade registra um ponto de partida. Responda individualmente, sem consultar outras pessoas.' : 'Esta atividade registra uma nova medida após as experiências de leitura. As questões são diferentes, mas trabalham habilidades semelhantes às da avaliação inicial.'}</p><p>São quatro questões curtas. Esta avaliação não concede nem retira XP, moedas ou corações.</p></div>
            <form id="reading-assessment-form">
                ${questions.map((q, i) => `<fieldset class="assessment-question"><legend><span>${i+1}. ${this.escapeHTML(q.text)}</span><small>${({literal:'Compreensão literal',inferencial:'Inferência',interpretacao:'Interpretação',critica:'Análise crítica'})[q.skill]}</small></legend>
                    ${q.options.map((option,j) => `<label class="assessment-option"><input type="radio" name="assessment-${i}" value="${j}" required><span>${this.escapeHTML(option)}</span></label>`).join('')}
                </fieldset>`).join('')}
                <div id="assessment-feedback" class="form-error" role="alert"></div>
                <button type="submit" class="btn-primary">Finalizar avaliação</button>
            </form>
        `;
        this.showPanel(`📊 ${label}`, html);
        Game.paused = true;
        document.getElementById('reading-assessment-form').addEventListener('submit', event => {
            event.preventDefault();
            const answers = questions.map((q, i) => document.querySelector(`input[name="assessment-${i}"]:checked`));
            if (answers.some(a => !a)) { document.getElementById('assessment-feedback').textContent = 'Responda às quatro questões antes de finalizar.'; return; }
            const bySkill = {};
            questions.forEach((q, i) => {
                bySkill[q.skill] ||= { correct: 0, total: 0 };
                bySkill[q.skill].total++;
                if (Number(answers[i].value) === q.correct) bySkill[q.skill].correct++;
            });
            const score = questions.reduce((sum, q, i) => sum + (Number(answers[i].value) === q.correct ? 1 : 0), 0);
            const result = { score, total: questions.length, percentage: Math.round(score / questions.length * 100), bySkill, completedAt: Date.now() };
            Game.state.stats ||= {};
            Game.state.stats[isInitial ? 'diagnosticInitial' : 'diagnosticFinal'] = result;
            if (isInitial) Game.state.stats.diagnosticTaken = true;
            Game.saveProgress();
            Storage.appendActivity(Game.state.username, { type: isInitial ? 'assessment_initial' : 'assessment_final', score, total: questions.length, bySkill });
            const form = document.getElementById('reading-assessment-form');
            form.innerHTML = `<div class="assessment-result"><div class="assessment-result-score">${score}/${questions.length}</div><h4>Avaliação registrada</h4><p>${isInitial ? 'Seu ponto de partida foi salvo. Agora comece sua jornada literária!' : 'Sua avaliação posterior foi registrada. A professora poderá comparar os resultados no painel.'}</p><p>Os resultados ficam disponíveis à professora de forma restrita.</p><button type="button" class="btn-primary" id="assessment-finish">Continuar</button></div>`;
            document.getElementById('assessment-finish').addEventListener('click', () => {
                this.hidePanel(); Game.paused = false; Game.lastTime = performance.now();
            });
        });
    },

    // ====== RECOMPENSA ======
    bindRewardOverlay() {
        document.getElementById('reward-continue').addEventListener('click', () => this.hideReward());
    },

    showReward(title, stats, icon = '🏆') {
        document.getElementById('reward-title').textContent = title;
        document.getElementById('reward-icon').textContent = icon;

        const statsHtml = stats.map(s => `
            <div class="reward-stat">
                <div class="reward-stat-label">${s.label}</div>
                <div class="reward-stat-value">${s.value}</div>
            </div>
        `).join('');
        document.getElementById('reward-stats').innerHTML = statsHtml;

        document.getElementById('reward-overlay').classList.add('visible');
    },

    hideReward() {
        document.getElementById('reward-overlay').classList.remove('visible');
        if (this._pendingTrailAfterReward) {
            this._pendingTrailAfterReward = false;
            setTimeout(() => this.showLevelTrail(), 220);
        }
    },

    // ====== INTERACTION HINT ======
    showInteractionHint(text = 'Interagir') {
        const hint = document.getElementById('interaction-hint');
        hint.querySelector('.hint-text').textContent = text;
        hint.classList.add('visible');
    },

    hideInteractionHint() {
        document.getElementById('interaction-hint').classList.remove('visible');
    }
};

window.UI = UI;
