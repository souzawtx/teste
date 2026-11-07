/* ============================================
   LIGA DOS LEITORES — Painel Pedagógico
   ============================================ */

const Teacher = {
    currentView: 'dashboard',

    init() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        document.getElementById('teacher-logout').addEventListener('click', () => App.logout());
    },

    enter(user) {
        document.getElementById('teacher-name').textContent = user.appearance?.name || user.username;
        document.querySelector('.teacher-avatar').textContent = (user.appearance?.name || user.username).charAt(0).toUpperCase();
        this.setView('dashboard');
    },

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const titles = {
            dashboard: 'Visão Geral',
            students: 'Estudantes',
            missions: 'Missões',
            worlds: 'Mundos Literários',
            reports: 'Relatórios de Aprendizagem',
            settings: 'Configurações'
        };
        document.getElementById('teacher-view-title').textContent = titles[view] || 'Painel';

        const container = document.getElementById('teacher-view');
        container.innerHTML = '';

        switch (view) {
            case 'dashboard': this.renderDashboard(container); break;
            case 'students': this.renderStudents(container); break;
            case 'missions': this.renderMissions(container); break;
            case 'worlds': this.renderWorlds(container); break;
            case 'reports': this.renderReports(container); break;
            case 'settings': this.renderSettings(container); break;
        }
    },

    renderDashboard(container) {
        const students = Storage.getAllStudents();
        const totalStudents = students.length;
        const activeStudents = students.filter(s => s.gameState && s.gameState.savedAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
        const totalMissions = students.reduce((sum, s) => sum + (s.gameState?.completedMissions?.length || 0), 0);
        const avgXp = totalStudents > 0 ? Math.round(students.reduce((sum, s) => sum + (s.gameState?.xp || 0), 0) / totalStudents) : 0;

        let html = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-label">Total de Estudantes</div>
                    <div class="stat-value">${totalStudents}</div>
                    <div class="stat-trend">Cadastrados na plataforma</div>
                </div>
                <div class="stat-card emerald">
                    <div class="stat-label">Ativos na Semana</div>
                    <div class="stat-value">${activeStudents}</div>
                    <div class="stat-trend positive">${totalStudents > 0 ? Math.round(activeStudents / totalStudents * 100) : 0}% dos cadastrados</div>
                </div>
                <div class="stat-card purple">
                    <div class="stat-label">Missões Concluídas</div>
                    <div class="stat-value">${totalMissions}</div>
                    <div class="stat-trend">Total pela turma</div>
                </div>
                <div class="stat-card azure">
                    <div class="stat-label">XP Médio</div>
                    <div class="stat-value">${avgXp}</div>
                    <div class="stat-trend">pontos por aluno</div>
                </div>
            </div>
        `;

        if (totalStudents === 0) {
            html += `
                <div class="content-section">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-title">Ainda não há dados de estudantes</div>
                        <div class="empty-state-text">Os indicadores aparecerão aqui conforme os estudantes acessarem a plataforma e completarem missões. Os dados exibidos refletem apenas atividades reais.</div>
                    </div>
                </div>
            `;
        } else {
            // Progresso recente
            const recentActivity = this._getRecentActivity(students);
            html += `
                <div class="content-section">
                    <div class="section-header">
                        <div class="section-title">Atividade Recente</div>
                    </div>
                    ${recentActivity.length > 0 ? `
                        <div class="mission-journal-list">
                            ${recentActivity.slice(0, 10).map(a => `
                                <div class="mission-journal-item">
                                    <div class="journal-icon">${a.icon}</div>
                                    <div class="journal-text">
                                        <div class="journal-title">${UI.escapeHTML(a.title)}</div>
                                        <div class="journal-desc">${UI.escapeHTML(a.description)}</div>
                                    </div>
                                    <div style="font-size:11px;color:var(--text-dim);white-space:nowrap;">${this._timeAgo(a.timestamp)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <div class="empty-state-text">Nenhuma atividade registrada ainda.</div>
                        </div>
                    `}
                </div>
            `;

            // Melhores da turma
            const topStudents = students
                .filter(s => s.gameState)
                .sort((a, b) => (b.gameState.xp || 0) - (a.gameState.xp || 0))
                .slice(0, 5);

            if (topStudents.length > 0) {
                html += `
                    <div class="content-section">
                        <div class="section-header">
                            <div class="section-title">Destaques da Turma</div>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Aluno(a)</th>
                                    <th>Nível</th>
                                    <th>XP</th>
                                    <th>Missões</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topStudents.map(s => {
                                    const level = Characters.getLevelInfo(s.gameState.xp || 0);
                                    const name = UI.escapeHTML(s.appearance?.name || s.username);
                                    return `
                                        <tr>
                                            <td>
                                                <div class="student-cell">
                                                    <div class="student-avatar">${name.charAt(0).toUpperCase()}</div>
                                                    <span>${name}</span>
                                                </div>
                                            </td>
                                            <td><span class="badge active">${level.name}</span></td>
                                            <td>${s.gameState.xp}</td>
                                            <td>${s.gameState.completedMissions?.length || 0}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }

        container.innerHTML = html;
    },

    renderStudents(container) {
        const students = Storage.getAllStudents();

        if (students.length === 0) {
            container.innerHTML = `
                <div class="content-section">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-title">Nenhum estudante cadastrado</div>
                        <div class="empty-state-text">Compartilhe o endereço da plataforma com seus alunos. Ao criarem personagens, aparecerão aqui.</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Lista de Estudantes</div>
                    <div style="font-size:13px;color:var(--text-muted);">${students.length} cadastrado(s)</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Estudante</th>
                            <th>Nível</th>
                            <th>Progresso</th>
                            <th>Missões</th>
                            <th>Último acesso</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            const game = s.gameState;
                            const level = game ? Characters.getLevelInfo(game.xp) : { level: 0, name: 'Não iniciado', currentXp: 0, neededXp: 100 };
                            const name = UI.escapeHTML(s.appearance?.name || s.username);
                            const progress = level.neededXp > 0 ? Math.round(level.currentXp / level.neededXp * 100) : 100;
                            const lastSeen = game?.savedAt ? this._timeAgo(game.savedAt) : 'Nunca';
                            const active = game?.savedAt && (Date.now() - game.savedAt) < 7 * 24 * 60 * 60 * 1000;

                            return `
                                <tr>
                                    <td>
                                        <div class="student-cell">
                                            <div class="student-avatar">${name.charAt(0).toUpperCase()}</div>
                                            <div>
                                                <div>${name}</div>
                                                <div style="font-size:11px;color:var(--text-dim);">@${s.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="badge pending">Nv.${level.level} ${level.name}</span></td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-bar-mini">
                                                <div class="progress-bar-mini-fill" style="width:${progress}%"></div>
                                            </div>
                                            <span style="font-size:11px;color:var(--text-muted);">${progress}%</span>
                                        </div>
                                    </td>
                                    <td>${game?.completedMissions?.length || 0}</td>
                                    <td>${lastSeen}</td>
                                    <td>
                                        <span class="badge ${active ? 'active' : 'inactive'}">${active ? 'Ativo' : 'Inativo'}</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderMissions(container) {
        const allMissions = Missions.getAll();
        const students = Storage.getAllStudents();
        container.innerHTML = `
            <div class="content-section">
                <div class="section-header">
                    <div><div class="section-title">Catálogo de missões</div><p class="section-subtitle">Crie desafios que trabalhem leitura literal, inferência e interpretação.</p></div>
                    <button class="btn-primary" id="teacher-new-mission">＋ Nova missão</button>
                </div>
                ${allMissions.length ? allMissions.map(m => {
                    const world = Worlds[m.worldId];
                    const completed = students.filter(st => st.gameState?.completedMissions?.includes(m.id)).length;
                    const custom = String(m.id).startsWith('custom_');
                    return `
                        <div class="mission-list-item">
                            <div class="mission-list-main">
                                <div class="mission-icon-box">${custom ? '✍️' : '📜'}</div>
                                <div class="mission-info-text">
                                    <div class="mission-list-title">${UI.escapeHTML(m.title)}</div>
                                    <div class="mission-list-meta">${UI.escapeHTML(world?.name || 'Mundo não disponível')} · ${m.xpReward} XP · ${m.coinReward} moedas · Concluída por ${completed} estudante(s)</div>
                                </div>
                            </div>
                            <div class="mission-list-actions">
                                <button class="icon-btn" data-mission-view="${UI.escapeHTML(m.id)}" title="Ver detalhes">👁</button>
                                ${custom ? `<button class="icon-btn" data-mission-edit="${UI.escapeHTML(m.id)}" title="Editar missão">✎</button>` : ''}
                            </div>
                        </div>`;
                }).join('') : '<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-title">Nenhuma missão cadastrada</div></div>'}
            </div>
        `;
        document.getElementById('teacher-new-mission').addEventListener('click', () => this._openMissionEditor());
        container.querySelectorAll('[data-mission-view]').forEach(button => button.addEventListener('click', () => this._showMissionDetails(button.dataset.missionView)));
        container.querySelectorAll('[data-mission-edit]').forEach(button => button.addEventListener('click', () => this._openMissionEditor(button.dataset.missionEdit)));
    },

    _openMissionEditor(missionId = null) {
        const existing = missionId ? Missions.get(missionId) : null;
        const customMissions = Storage.getCustomMissions();
        const all = Missions.getAll();
        const esc = value => UI.escapeHTML(value || '');
        const choices = [
            { value: 'literal', label: 'Compreensão literal' },
            { value: 'inferencial', label: 'Inferência' },
            { value: 'interpretacao', label: 'Interpretação' },
            { value: 'critica', label: 'Análise crítica' }
        ];
        const selectedSkill = existing?.skill || 'interpretacao';
        const options = [0, 1, 2, 3].map(i => existing?.options?.[i] || { text: '', correct: i === 0, feedback: '' });
        UI.showPanel(existing ? '✏️ Editar missão' : '✍️ Criar missão literária', `
            <form id="mission-editor-form" class="mission-editor-form">
                <div class="form-group"><label for="editor-title">Título da missão *</label><input id="editor-title" maxlength="100" required value="${esc(existing?.title)}" placeholder="Ex.: As pistas do narrador"></div>
                <div class="form-group"><label for="editor-briefing">Contexto / apresentação da missão *</label><textarea id="editor-briefing" maxlength="800" rows="3" required placeholder="Explique ao estudante o que precisa investigar.">${esc(existing?.briefing)}</textarea></div>
                <div class="form-group"><label for="editor-excerpt">Trecho de leitura</label><textarea id="editor-excerpt" maxlength="2500" rows="5" placeholder="Insira um trecho curto ou uma passagem autorizada.">${esc(existing?.excerpt?.text)}</textarea></div>
                <div class="form-group"><label for="editor-source">Referência do trecho</label><input id="editor-source" maxlength="180" value="${esc(existing?.excerpt?.source)}" placeholder="Autor — obra — edição/página"></div>
                <div class="form-group"><label for="editor-question">Pergunta *</label><textarea id="editor-question" maxlength="500" rows="2" required>${esc(existing?.question)}</textarea></div>
                <div class="mission-editor-options">
                    ${options.map((o, i) => `
                        <div class="mission-editor-option">
                            <label class="option-editor-label"><input type="radio" name="editor-correct" value="${i}" ${o.correct ? 'checked' : ''}> Alternativa ${String.fromCharCode(65+i)} é a correta</label>
                            <input id="editor-option-${i}" maxlength="350" value="${esc(o.text)}" placeholder="Texto da alternativa ${String.fromCharCode(65+i)}" ${i < 2 ? 'required' : ''}>
                            <input id="editor-feedback-${i}" maxlength="500" value="${esc(o.feedback)}" placeholder="Feedback para esta alternativa (opcional)">
                        </div>`).join('')}
                </div>
                <div class="form-group"><label for="editor-hint">Dica progressiva</label><textarea id="editor-hint" maxlength="500" rows="2">${esc(existing?.hint)}</textarea></div>
                <div class="form-grid-two">
                    <div class="form-group"><label for="editor-skill">Habilidade principal *</label><select id="editor-skill">${choices.map(c => `<option value="${c.value}" ${selectedSkill === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
                    <div class="form-group"><label for="editor-xp">XP da missão</label><input id="editor-xp" type="number" min="5" max="300" value="${existing?.xpReward ?? Storage.getTeacherConfig().missionRules.xpPerQuestion}" required></div>
                    <div class="form-group"><label for="editor-coins">Moedas da missão</label><input id="editor-coins" type="number" min="0" max="200" value="${existing?.coinReward ?? 10}" required></div>
                </div>
                <p class="form-help">A missão será vinculada ao mundo jogável “O Enigma da Metamorfose”. Deve haver pelo menos duas alternativas e exatamente uma resposta correta.</p>
                <div class="form-actions"><button type="button" class="btn-secondary" id="editor-cancel">Cancelar</button><button type="submit" class="btn-primary">Salvar missão</button></div>
                <div id="editor-error" class="form-error" role="alert"></div>
            </form>
        `);
        document.getElementById('editor-cancel').addEventListener('click', () => UI.hidePanel());
        document.getElementById('mission-editor-form').addEventListener('submit', async event => {
            event.preventDefault();
            const selected = document.querySelector('input[name="editor-correct"]:checked');
            if (!selected) { document.getElementById('editor-error').textContent = 'Marque uma alternativa correta.'; return; }
            const values = [0,1,2,3].map(i => ({
                text: document.getElementById(`editor-option-${i}`).value.trim(),
                correct: Number(selected.value) === i,
                feedback: document.getElementById(`editor-feedback-${i}`).value.trim() || (Number(selected.value) === i ? 'Muito bem! Você identificou a resposta com base na leitura.' : 'Retome o trecho, observe as pistas e tente novamente.')
            })).filter(o => o.text);
            if (values.length < 2 || values.filter(o => o.correct).length !== 1) {
                document.getElementById('editor-error').textContent = 'Inclua ao menos duas alternativas e marque exatamente uma como correta.';
                return;
            }
            const mission = {
                id: existing?.id || `custom_${Date.now().toString(36)}`,
                worldId: 'metamorphosis', order: existing?.order || (all.length + 1),
                title: document.getElementById('editor-title').value.trim(),
                briefing: document.getElementById('editor-briefing').value.trim(),
                npcId: null, xpReward: Number(document.getElementById('editor-xp').value),
                coinReward: Number(document.getElementById('editor-coins').value), type: 'quiz',
                requires: existing?.requires || [],
                excerpt: { text: document.getElementById('editor-excerpt').value.trim(), source: document.getElementById('editor-source').value.trim() },
                question: document.getElementById('editor-question').value.trim(), options: values,
                hint: document.getElementById('editor-hint').value.trim(),
                skill: document.getElementById('editor-skill').value, published: true, createdAt: existing?.createdAt || Date.now()
            };
            const next = customMissions.filter(m => m.id !== mission.id);
            next.push(mission);
            const saveButton = event.submitter;
            saveButton.disabled = true; saveButton.textContent = 'Salvando...';
            try {
                Storage.set('custom_missions', next);
                await SyncApi.saveMissions(next);
                UI.hidePanel();
                UI.toast('Missão salva e sincronizada!', 'success', '📜');
                this.setView('missions');
            } catch (error) {
                saveButton.disabled = false; saveButton.textContent = 'Salvar missão';
                document.getElementById('editor-error').textContent = `Não foi possível salvar no servidor: ${error.message}`;
            }
        });
    },

    _showMissionDetails(missionId) {
        const m = Missions.get(missionId);
        if (!m) return;
        UI.showPanel(`📜 ${UI.escapeHTML(m.title)}`, `
            <p style="margin-bottom:14px;"><strong>Mundo:</strong> ${Worlds[m.worldId].name}</p>
            <p style="margin-bottom:14px;"><strong>Briefing:</strong> ${UI.escapeHTML(m.briefing)}</p>
            ${m.excerpt ? `
                <div class="literary-excerpt">
                    ${UI.escapeHTML(m.excerpt.text)}
                    <span class="excerpt-source">— ${UI.escapeHTML(m.excerpt.source)}</span>
                </div>
            ` : ''}
            <p style="margin:14px 0;"><strong>Pergunta:</strong> ${UI.escapeHTML(m.question)}</p>
            <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0;">
                ${m.options.map((o, i) => `
                    <div style="padding:10px;background:${o.correct ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.05)'};border:1px solid ${o.correct ? 'var(--emerald)' : 'var(--border)'};border-radius:8px;">
                        <strong>${String.fromCharCode(65 + i)}.</strong> ${UI.escapeHTML(o.text)}
                        ${o.correct ? '<span style="color:var(--emerald-light);font-weight:600;margin-left:8px;">✓ Correta</span>' : ''}
                        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Feedback: ${UI.escapeHTML(o.feedback)}</div>
                    </div>
                `).join('')}
            </div>
            <p style="margin-top:14px;font-size:13px;color:var(--text-muted);"><strong>Dica pedagógica:</strong> ${UI.escapeHTML(m.hint)}</p>
            ${String(m.id).startsWith('custom_') ? `<button class="btn-secondary" id="edit-this-mission">Editar esta missão</button>` : ''}
            <p style="margin-top:14px;font-size:13px;color:var(--text-muted);"><strong>Recompensa:</strong> ${m.xpReward} XP + ${m.coinReward} moedas</p>
        `);
        const editButton = document.getElementById('edit-this-mission');
        if (editButton) editButton.addEventListener('click', () => this._openMissionEditor(missionId));
    },

    renderWorlds(container) {
        const worldIds = ['overworld', 'metamorphosis'];
        const futureWorlds = [
            { title: 'Operação Anexo Secreto', author: 'Anne Frank', icon: '📔', color: '#d97706' },
            { title: 'Sobreviventes do Sertão', author: 'Graciliano Ramos', icon: '🌵', color: '#92400e' },
            { title: 'Os Segredos de Iracema', author: 'José de Alencar', icon: '🌳', color: '#059669' },
            { title: 'O Mistério da Cartomante', author: 'Machado de Assis', icon: '🔮', color: '#7c3aed' },
            { title: 'Os Arquivos do Alienista', author: 'Machado de Assis', icon: '🧪', color: '#dc2626' },
        ];

        container.innerHTML = `
            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Mundos Ativos</div>
                </div>
                <div class="world-list">
                    ${worldIds.map(id => {
                        const w = Worlds[id];
                        const missions = Missions.getByWorld(id);
                        return `
                            <div class="world-card">
                                <div class="world-cover" style="background: linear-gradient(135deg, ${id === 'overworld' ? '#4a7c3f, #2d4a1f' : '#7c3aed, #4c1d95'});">
                                    ${id === 'overworld' ? '🗺️' : '🪲'}
                                </div>
                                <div class="world-info">
                                    <div class="world-title">${w.name}</div>
                                    <div class="world-description">${id === 'overworld' ? 'Área central onde os estudantes exploram e acessam outros mundos.' : 'Baseado em "A Metamorfose" de Franz Kafka. Explora alienação e desumanização.'}</div>
                                    <div class="world-stats">
                                        <div class="world-stat">📜 ${missions.length} missões</div>
                                        <div class="world-stat">🏛 ${w.objects.length} objetos</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Mundos em Preparação</div>
                </div>
                <div class="world-list">
                    ${futureWorlds.map(f => `
                        <div class="world-card" style="opacity:0.6;">
                            <div class="world-cover locked" style="background: linear-gradient(135deg, ${f.color}, #1a0f2e);">
                                ${f.icon}
                            </div>
                            <div class="world-info">
                                <div class="world-title">${f.title}</div>
                                <div class="world-author">${f.author}</div>
                                <div class="world-description">Será liberado em versões futuras da plataforma.</div>
                                <div class="world-stats">
                                    <div class="world-stat">🔒 Bloqueado</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderReports(container) {
        const students = Storage.getAllStudents();

        if (students.length === 0) {
            container.innerHTML = `
                <div class="content-section">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">Sem dados para relatórios ainda</div>
                        <div class="empty-state-text">Os indicadores de compreensão, inferência e interpretação só aparecerão após os alunos realizarem missões reais. Nenhum dado fictício é apresentado nesta plataforma.</div>
                    </div>
                </div>
            `;
            return;
        }

        // Agregar dados reais
        const allActivity = [];
        students.forEach(s => {
            const act = Storage.getActivity(s.username);
            act.forEach(a => allActivity.push({ ...a, student: s }));
        });

        // A taxa é calculada a partir dos eventos registrados (conclusões e respostas incorretas),
        // evitando misturar contadores cumulativos de missões com tentativas.
        const totalCorrect = allActivity.filter(item => item.type === 'mission_complete').length;
        const totalWrong = allActivity.filter(item => item.type === 'mission_wrong').length;
        const total = totalCorrect + totalWrong;
        const accuracyRate = total > 0 ? Math.round(totalCorrect / total * 100) : 0;
        const pairedAssessments = students.filter(student => student.gameState?.stats?.diagnosticInitial && student.gameState?.stats?.diagnosticFinal);
        const initialAverage = pairedAssessments.length ? Math.round(pairedAssessments.reduce((sum, student) => sum + Number(student.gameState.stats.diagnosticInitial.percentage || 0), 0) / pairedAssessments.length) : null;
        const finalAverage = pairedAssessments.length ? Math.round(pairedAssessments.reduce((sum, student) => sum + Number(student.gameState.stats.diagnosticFinal.percentage || 0), 0) / pairedAssessments.length) : null;
        const skillLabels = { literal: 'Compreensão literal', inferencial: 'Inferência', interpretacao: 'Interpretação', critica: 'Análise crítica' };
        const assessmentSkillSummary = Object.keys(skillLabels).map(skill => {
            const summarize = field => {
                const rows = pairedAssessments.map(student => student.gameState.stats[field]?.bySkill?.[skill]).filter(Boolean);
                const correct = rows.reduce((sum, row) => sum + (Number(row.correct) || 0), 0);
                const attempts = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
                return { rate: attempts ? Math.round(correct / attempts * 100) : null, attempts };
            };
            return { skill, label: skillLabels[skill], initial: summarize('diagnosticInitial'), final: summarize('diagnosticFinal') };
        });
        const diagnosticPanel = pairedAssessments.length ? `
            <div class="content-section">
                <div class="section-header"><div><div class="section-title">Avaliação inicial e posterior de leitura</div><p class="section-subtitle">Comparação apenas dos estudantes com as duas avaliações registradas. As formas A e B são paralelas e os resultados são descritivos.</p></div></div>
                <div class="dashboard-grid">
                    <div class="stat-card azure"><div class="stat-label">Avaliação inicial média</div><div class="stat-value">${initialAverage}%</div><div class="stat-trend">${pairedAssessments.length} estudante(s) com par completo</div></div>
                    <div class="stat-card emerald"><div class="stat-label">Avaliação posterior média</div><div class="stat-value">${finalAverage}%</div><div class="stat-trend">Variação: ${finalAverage - initialAverage >= 0 ? '+' : ''}${finalAverage - initialAverage} pontos percentuais</div></div>
                </div>
                <div class="skill-summary-grid">${assessmentSkillSummary.map(item => `<div class="skill-summary-card"><strong>${item.label}</strong><span>Inicial: ${item.initial.rate === null ? 'Sem dados' : `${item.initial.rate}%`}</span><span>Posterior: ${item.final.rate === null ? 'Sem dados' : `${item.final.rate}%`}</span><small>Respostas válidas: ${item.initial.attempts} no início · ${item.final.attempts} depois</small></div>`).join('')}</div>
                <p class="form-help">Esses resultados correspondem às atividades de avaliação da plataforma. Não substituem uma avaliação padronizada nem, isoladamente, comprovam que a plataforma causou mudanças na aprendizagem.</p>
            </div>` : `
            <div class="content-section"><div class="section-header"><div class="section-title">Avaliação inicial e posterior de leitura</div></div><div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-title">Ainda não há pares de avaliação</div><div class="empty-state-text">Os indicadores aparecerão quando estudantes concluírem a avaliação inicial e, depois de realizar missões, a avaliação posterior.</div></div></div>`;

        // Dados por missão
        const missionStats = {};
        Missions.getAll().forEach(m => {
            missionStats[m.id] = { title: m.title, completed: 0, attempts: 0, world: Worlds[m.worldId]?.name || 'Mundo não disponível' };
        });

        students.forEach(s => {
            s.gameState?.completedMissions?.forEach(id => {
                if (missionStats[id]) missionStats[id].completed++;
            });
        });
        allActivity.forEach(a => {
            if ((a.type === 'mission_wrong' || a.type === 'mission_complete') && missionStats[a.missionId]) {
                missionStats[a.missionId].attempts++;
            }
        });

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card emerald">
                    <div class="stat-label">Índice de conclusão</div>
                    <div class="stat-value">${accuracyRate}%</div>
                    <div class="stat-trend">${totalCorrect} missões concluídas / ${total} registros de tentativa</div>
                </div>
                <div class="stat-card purple">
                    <div class="stat-label">Missões Concluídas</div>
                    <div class="stat-value">${totalCorrect}</div>
                    <div class="stat-trend">Total agregado</div>
                </div>
                <div class="stat-card crimson">
                    <div class="stat-label">Tentativas Incorretas</div>
                    <div class="stat-value">${totalWrong}</div>
                    <div class="stat-trend">Reflexão em andamento</div>
                </div>
            </div>

            ${diagnosticPanel}

            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Desempenho por Missão</div><p class="section-subtitle">Conclusões e tentativas registradas; não equivale a uma medida padronizada de compreensão leitora.</p>
                </div>
                ${Object.values(missionStats).map(m => `
                    <div class="skill-row">
                        <div class="skill-header">
                            <span class="skill-name">${UI.escapeHTML(m.title)}</span>
                            <span class="skill-values">${m.completed} aluno(s) concluíram · ${m.attempts} tentativa(s)</span>
                        </div>
                        <div class="skill-bars">
                            <div class="skill-bar-container">
                                <span class="skill-bar-label">Conclusão</span>
                                <div class="skill-bar">
                                    <div class="skill-bar-fill posterior" style="width:${students.length > 0 ? Math.min(100, m.completed / students.length * 100) : 0}%"></div>
                                </div>
                                <span class="skill-bar-value">${students.length > 0 ? Math.round(m.completed / students.length * 100) : 0}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Progresso Individual</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Aluno(a)</th>
                            <th>Nível</th>
                            <th>Missões concluídas</th>
                            <th>Precisão</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            const g = s.gameState;
                            if (!g) return '';
                            const name = UI.escapeHTML(s.appearance?.name || s.username);
                            const level = Characters.getLevelInfo(g.xp);
                            const studentEvents = Storage.getActivity(s.username);
                            const correct = studentEvents.filter(item => item.type === 'mission_complete').length;
                            const wrong = studentEvents.filter(item => item.type === 'mission_wrong').length;
                            const totalAttempts = correct + wrong;
                            const prec = totalAttempts > 0 ? Math.round(correct / totalAttempts * 100) : 0;
                            return `
                                <tr>
                                    <td>
                                        <div class="student-cell">
                                            <div class="student-avatar">${name.charAt(0).toUpperCase()}</div>
                                            <span>${name}</span>
                                        </div>
                                    </td>
                                    <td><span class="badge active">${level.name}</span></td>
                                    <td>${correct}</td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-bar-mini">
                                                <div class="progress-bar-mini-fill" style="width:${prec}%"></div>
                                            </div>
                                            <span>${prec}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="content-section">
                <p style="font-size:13px;color:var(--text-muted);text-align:center;font-style:italic;">
                    Os indicadores pedagógicos nesta tela refletem dados reais de missões concluídas pelos estudantes.<br>
                    À medida que mais alunos participarem, as métricas se tornarão mais ricas.
                </p>
            </div>
        `;
    },

    renderSettings(container) {
        const config = Storage.getTeacherConfig();

        container.innerHTML = `
            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Turmas</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr><th>Código</th><th>Nome</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                        ${config.classes.map(c => `
                            <tr>
                                <td><code>${UI.escapeHTML(c.code)}</code></td>
                                <td>${UI.escapeHTML(c.name)}</td>
                                <td><button class="icon-btn" disabled>✎</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <form id="class-form" class="form-grid-two class-create-form">
                    <div class="form-group"><label for="new-class-code">Código da nova turma</label><input id="new-class-code" maxlength="24" placeholder="Ex.: 9ANO-A" pattern="[A-Za-z0-9_-]{2,24}" required></div>
                    <div class="form-group"><label for="new-class-name">Nome da turma</label><input id="new-class-name" maxlength="80" placeholder="Ex.: 9º Ano A" required></div>
                    <button class="btn-secondary" type="submit">＋ Adicionar turma</button>
                    <p id="class-form-feedback" class="form-help" aria-live="polite"></p>
                </form>
            </div>

            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Regras das Missões</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:14px;max-width:500px;">
                    <div class="form-group">
                        <label>Corações iniciais por missão</label>
                        <input type="number" id="setting-hearts" value="${config.missionRules.startingHearts}" min="1" max="5">
                    </div>
                    <div class="form-group">
                        <label>XP padrão para novas missões</label>
                        <input type="number" id="setting-xp" value="${config.missionRules.xpPerQuestion}" min="5" max="100" step="5">
                    </div>
                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:8px;">
                            <input type="checkbox" id="setting-recovery" ${config.missionRules.allowHeartRecovery ? 'checked' : ''}>
                            Recuperar automaticamente após esgotar os corações
                        </label>
                        <small class="form-help">Se desmarcado, o estudante deverá revisar o trecho e solicitar a recuperação manualmente.</small>
                    </div>
                    <button class="btn-primary" id="save-settings-btn">Salvar Configurações</button>
                </div>
            </div>

            <div class="content-section">
                <div class="section-header">
                    <div class="section-title">Dados do Sistema</div>
                </div>
                <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px;">
                    Os dados são sincronizados com o servidor central da Liga. O arquivo de banco fica na pasta data do servidor; faça cópias de segurança regularmente.
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn-secondary" id="export-data-btn">⬇ Exportar dados (JSON)</button>
                    <button class="btn-ghost" id="reset-data-btn" style="color:var(--crimson-light);">Limpar todos os dados</button>
                </div>
            </div>
        `;

        document.getElementById('class-form').addEventListener('submit', async event => {
            event.preventDefault();
            const code = document.getElementById('new-class-code').value.trim().toUpperCase();
            const name = document.getElementById('new-class-name').value.trim();
            const feedback = document.getElementById('class-form-feedback');
            if (config.classes.some(item => item.code === code)) { feedback.textContent = 'Esse código já está cadastrado.'; return; }
            const nextConfig = { ...config, classes: [...config.classes, { code, name }] };
            try {
                await SyncApi.saveConfig(nextConfig);
                Storage.saveTeacherConfig(nextConfig);
                UI.toast(`Turma ${code} cadastrada!`, 'success', '🏫');
                await SyncApi.loadClasses();
                this.setView('settings');
            } catch (error) { feedback.textContent = `Não foi possível cadastrar a turma: ${error.message}`; }
        });

        document.getElementById('save-settings-btn').addEventListener('click', async () => {
            const newConfig = {
                ...config,
                missionRules: {
                    startingHearts: parseInt(document.getElementById('setting-hearts').value) || 3,
                    xpPerQuestion: parseInt(document.getElementById('setting-xp').value) || 20,
                    allowHeartRecovery: document.getElementById('setting-recovery').checked,
                }
            };
            try {
                await SyncApi.saveConfig(newConfig);
                Storage.saveTeacherConfig(newConfig);
                UI.toast('Configurações salvas no servidor!', 'success', '✓');
                SyncApi.loadClasses();
            } catch (error) { UI.toast(`Falha ao salvar: ${error.message}`, 'error', '⚠️', 5000); }
        });

        document.getElementById('export-data-btn').addEventListener('click', () => this._exportData());
        document.getElementById('reset-data-btn').addEventListener('click', () => this._resetData());
    },

    _exportData() {
        const data = {
            users: Object.entries(Storage.getUsers()).map(([username, u]) => ({ username, role: u.role, classCode: u.classCode || '', appearance: u.appearance || null })),
            config: Storage.getTeacherConfig(),
            customMissions: Storage.getCustomMissions(),
            students: Storage.getAllStudents().map(s => ({
                ...s,
                activity: Storage.getActivity(s.username)
            })),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liga-leitores-dados-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Dados exportados!', 'success', '📥');
    },

    async _resetData() {
        if (!confirm('Tem certeza de que deseja apagar as contas e os dados de TODOS os estudantes no servidor? Esta ação é irreversível.')) return;
        if (!confirm('Última confirmação: apagar estudantes, progresso e missões personalizadas? A conta da professora e as configurações serão preservadas.')) return;
        try {
            await SyncApi.request('/teacher/students', { method: 'DELETE', body: JSON.stringify({ confirm: 'APAGAR ESTUDANTES' }) });
            Storage.clear();
            UI.toast('Dados dos estudantes e missões personalizadas apagados no servidor.', 'info', '🗑');
            setTimeout(() => App.logout(), 1000);
        } catch (error) {
            UI.toast(`Não foi possível apagar os dados: ${error.message}`, 'error', '⚠️', 5000);
        }
    },

    _getRecentActivity(students) {
        const all = [];
        students.forEach(s => {
            const activity = Storage.getActivity(s.username);
            const name = s.appearance?.name || s.username;
            activity.slice(-5).forEach(a => {
                if (a.type === 'mission_complete') {
                    all.push({
                        timestamp: a.timestamp,
                        icon: '✅',
                        title: `${name} concluiu "${a.missionTitle}"`,
                        description: `+${a.xpGained || 0} XP ${a.usedHint ? '(com dica)' : ''}`
                    });
                } else if (a.type === 'mission_start') {
                    all.push({
                        timestamp: a.timestamp,
                        icon: '📜',
                        title: `${name} iniciou "${a.missionTitle}"`,
                        description: 'Nova aventura começou'
                    });
                }
            });
        });
        return all.sort((a, b) => b.timestamp - a.timestamp);
    },

    _timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const min = Math.floor(diff / 60000);
        const hr = Math.floor(min / 60);
        const day = Math.floor(hr / 24);
        if (day > 0) return `${day}d atrás`;
        if (hr > 0) return `${hr}h atrás`;
        if (min > 0) return `${min}min atrás`;
        return 'Agora';
    }
};

window.Teacher = Teacher;
