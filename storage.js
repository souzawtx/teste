/* ============================================
   LIGA DOS LEITORES — Sistema de Armazenamento
   ============================================ */

const Storage = {
    PREFIX: 'ligaleitores_v1_',

    _getKey(key) {
        return this.PREFIX + key;
    },

    _safe(fn, fallback) {
        try {
            return fn();
        } catch (e) {
            console.warn('[Storage]', e);
            return fallback;
        }
    },

    get(key, fallback = null) {
        return this._safe(() => {
            const raw = localStorage.getItem(this._getKey(key));
            if (raw === null) return fallback;
            return JSON.parse(raw);
        }, fallback);
    },

    set(key, value) {
        return this._safe(() => {
            localStorage.setItem(this._getKey(key), JSON.stringify(value));
            return true;
        }, false);
    },

    remove(key) {
        return this._safe(() => {
            localStorage.removeItem(this._getKey(key));
            return true;
        }, false);
    },

    clear() {
        return this._safe(() => {
            Object.keys(localStorage)
                .filter(k => k.startsWith(this.PREFIX))
                .forEach(k => localStorage.removeItem(k));
            return true;
        }, false);
    },

    // ====== Gerenciamento de usuários ======
    getUsers() {
        return this.get('users', {});
    },

    getUser(username) {
        const users = this.getUsers();
        return users[username] || null;
    },

    saveUser(username, data) {
        const users = this.getUsers();
        const safeData = { ...data };
        // Senhas nunca são armazenadas no navegador. A autenticação é feita pelo servidor.
        delete safeData.password;
        users[username] = { ...users[username], ...safeData, updatedAt: Date.now() };
        const saved = this.set('users', users);
        if (safeData.appearance && window.SyncApi) SyncApi.persistProfile(username, safeData.appearance);
        return saved;
    },

    // ====== Sessão atual ======
    getSession() {
        return this.get('session', null);
    },

    setSession(session) {
        return this.set('session', session);
    },

    clearSession() {
        return this.remove('session');
    },

    // ====== Estado do jogo (progresso do estudante) ======
    getGameState(username) {
        const key = `game_${username}`;
        return this.get(key, null);
    },

    saveGameState(username, state) {
        const key = `game_${username}`;
        state.savedAt = Date.now();
        const saved = this.set(key, state);
        if (window.SyncApi) SyncApi.persistGameState(username, state);
        return saved;
    },

    // ====== Logs de atividade ======
    appendActivity(username, activity) {
        const key = `activity_${username}`;
        const log = this.get(key, []);
        log.push({ ...activity, timestamp: Date.now() });
        if (log.length > 500) log.splice(0, log.length - 500);
        const saved = this.set(key, log);
        // Registros pedagógicos também precisam chegar ao servidor para compor os relatórios da professora.
        if (window.SyncApi) SyncApi.appendActivity(username, activity);
        return saved;
    },

    getActivity(username) {
        return this.get(`activity_${username}`, []);
    },

    // ====== Config da professora ======
    getTeacherConfig() {
        return this.get('teacher_config', {
            classes: [{ code: '8ANO-B', name: '8º Ano B' }],
            missionRules: {
                startingHearts: 3,
                allowHeartRecovery: true,
                xpPerQuestion: 20,
            }
        });
    },

    saveTeacherConfig(config) {
        return this.set('teacher_config', config);
    },

    getCustomMissions() {
        return this.get('custom_missions', []);
    },

    saveCustomMissions(missions) {
        const saved = this.set('custom_missions', missions);
        if (window.SyncApi) SyncApi.saveMissions(missions).catch(error => console.warn(error));
        return saved;
    },

    // ====== Estudantes (lista agregada) ======
    getAllStudents() {
        const users = this.getUsers();
        return Object.entries(users)
            .filter(([_, u]) => u.role === 'student')
            .map(([username, u]) => ({
                username,
                ...u,
                gameState: this.getGameState(username)
            }));
    }
};

window.Storage = Storage;
