/* Liga dos Leitores — integração com servidor e sincronização centralizada. */
const SyncApi = {
    currentUser: null,
    ready: false,
    rankingScope: 'individual',
    stateWriteQueue: Promise.resolve(),
    activityWriteQueue: Promise.resolve(),
    async request(path, options = {}) {
        const response = await fetch(`/api${path}`, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        let payload = {};
        try { payload = await response.json(); } catch { /* resposta sem JSON */ }
        if (!response.ok) {
            const error = new Error(payload.error || `Falha na comunicação (${response.status}).`);
            error.status = response.status;
            throw error;
        }
        return payload;
    },
    async loadClasses() {
        try {
            const data = await this.request('/classes');
            const list = document.getElementById('class-code-options');
            if (list) list.innerHTML = (data.classes || []).map(item => `<option value="${String(item.code).replace(/[&<>\"']/g, '')}">${String(item.name).replace(/[&<>\"']/g, '')}</option>`).join('');
        } catch (error) { console.warn('[Liga API] Lista de turmas indisponível:', error.message); }
    },
    async teacherSetupStatus() {
        return this.request('/auth/teacher-setup-status');
    },
    async setupTeacher(username, password, confirmPassword) {
        const payload = await this.request('/auth/setup-teacher', {
            method: 'POST', body: JSON.stringify({ username, password, confirmPassword })
        });
        this.currentUser = payload.user;
        this.hydrate(payload.data);
        this.ready = true;
        return payload.user;
    },
    async access(username, password, role, classCode) {
        const payload = await this.request('/auth/access', {
            method: 'POST', body: JSON.stringify({ username, password, role, classCode })
        });
        this.currentUser = payload.user;
        this.hydrate(payload.data);
        this.ready = true;
        return payload.user;
    },
    async resume() {
        try {
            const payload = await this.request('/auth/session');
            this.currentUser = payload.user;
            this.hydrate(payload.data);
            this.ready = true;
            return payload.user;
        } catch (error) {
            this.currentUser = null;
            this.ready = false;
            if (error.status !== 401) console.warn('[Liga API]', error.message);
            return null;
        }
    },
    hydrate(data = {}) {
        const users = {};
        if (Array.isArray(data.students)) {
            data.students.forEach(student => {
                users[student.username] = {
                    role: 'student', classCode: student.classCode || '', appearance: student.appearance || null,
                    createdAt: student.createdAt, updatedAt: student.gameState?.savedAt || null
                };
                if (student.gameState) Storage.set(`game_${student.username}`, student.gameState);
                else Storage.remove(`game_${student.username}`);
                Storage.set(`activity_${student.username}`, Array.isArray(student.activity) ? student.activity : []);
            });
        }
        if (data.user) {
            const student = data.user;
            users[student.username] = {
                role: 'student', classCode: student.classCode || '', appearance: student.appearance || null,
                createdAt: student.createdAt, updatedAt: student.gameState?.savedAt || null
            };
            if (student.gameState) Storage.set(`game_${student.username}`, student.gameState);
            else Storage.remove(`game_${student.username}`);
            Storage.set(`activity_${student.username}`, Array.isArray(student.activity) ? student.activity : []);
        }
        if (this.currentUser?.role === 'teacher') {
            users[this.currentUser.username] = { role: 'teacher', appearance: null };
        }
        Storage.set('users', users);
        if (data.teacherConfig) Storage.set('teacher_config', data.teacherConfig);
        if (Array.isArray(data.customMissions)) Storage.set('custom_missions', data.customMissions);
    },
    async refreshTeacherData() {
        const data = await this.request('/data');
        this.hydrate(data);
        return data;
    },
    async logout() {
        // Aguarda os últimos salvamentos antes de encerrar a sessão.
        await Promise.allSettled([this.stateWriteQueue, this.activityWriteQueue]);
        try { await this.request('/auth/logout', { method: 'POST', body: '{}' }); } catch (error) { console.warn(error); }
        this.currentUser = null; this.ready = false;
        Storage.clearSession();
    },
    async persistProfile(username, appearance) {
        if (!this.ready || this.currentUser?.role !== 'student' || this.currentUser.username !== username) {
            throw new Error('Sua sessão de estudante não está ativa. Entre novamente para salvar o avatar.');
        }
        return this.request('/profile', { method: 'PUT', body: JSON.stringify({ appearance }) });
    },
    async persistGameState(username, gameState) {
        if (!this.ready || this.currentUser?.role !== 'student' || this.currentUser.username !== username) return;
        // Serializa salvamentos para que uma resposta atrasada não sobrescreva um estado mais recente.
        this.stateWriteQueue = this.stateWriteQueue.catch(() => {}).then(() =>
            this.request('/game-state', { method: 'PUT', body: JSON.stringify({ gameState }) })
        );
        try { await this.stateWriteQueue; }
        catch (error) { console.warn('[Liga API] Não foi possível sincronizar o progresso:', error.message); }
    },
    async appendActivity(username, activity) {
        if (!this.ready || this.currentUser?.role !== 'student' || this.currentUser.username !== username) return;
        this.activityWriteQueue = this.activityWriteQueue.catch(() => {}).then(() =>
            this.request('/activity', { method: 'POST', body: JSON.stringify({ activity }) })
        );
        try { await this.activityWriteQueue; }
        catch (error) { console.warn('[Liga API] Não foi possível sincronizar a atividade:', error.message); }
    },
    async saveConfig(config) {
        if (!this.ready || this.currentUser?.role !== 'teacher') throw new Error('Entre com uma conta de professora para salvar as configurações.');
        return this.request('/config', { method: 'PUT', body: JSON.stringify({ config }) });
    },
    async saveMissions(missions) {
        if (!this.ready || this.currentUser?.role !== 'teacher') return;
        try { await this.request('/missions', { method: 'PUT', body: JSON.stringify({ missions }) }); }
        catch (error) { console.warn('[Liga API] Não foi possível salvar as missões:', error.message); throw error; }
    },
    async getRanking() {
        const payload = await this.request('/ranking');
        this.rankingScope = payload.scope || 'individual';
        return payload.students || [];
    }
};
window.SyncApi = SyncApi;
