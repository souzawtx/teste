/* ============================================
   LIGA DOS LEITORES — Controlador Principal
   ============================================ */

const App = {
    currentUser: null,
    currentRole: 'student',

    characterDraft: null,

    init() {
        UI.init();
        Game.init();
        Teacher.init();

        this.bindLoginScreen();
        this.bindCharacterScreen();
        this.bindIntroScreen();
        SyncApi.loadClasses();

        // Restaura a sessão segura no servidor. O progresso local é apenas cache.
        setTimeout(() => { this.resumeSession(); }, 500);
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    async resumeSession() {
        const user = await SyncApi.resume();
        if (user) {
            this.currentUser = user;
            this.currentRole = user.role || 'student';
            Storage.setSession({ username: user.username, role: user.role });
            if (this.currentRole === 'teacher') await this.enterTeacher();
            else if (user.appearance) this.enterGame();
            else this.showCharacterCreation();
            return;
        }
        // Remove o cache desta instalação quando não há sessão válida; os dados oficiais permanecem no servidor.
        Storage.clear();
        this.showScreen('login-screen');
    },

    // ====== LOGIN ======
    bindLoginScreen() {
        const loginForm = document.getElementById('login-form');
        const setupPanel = document.getElementById('teacher-setup-panel');
        const setupOpen = document.getElementById('teacher-setup-open');
        const setupForm = document.getElementById('teacher-setup-form');
        const setupCancel = document.getElementById('teacher-setup-cancel');

        // Troca entre as áreas de estudante e professora.
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRole = btn.dataset.tab;
                document.getElementById('class-group').style.display =
                    this.currentRole === 'student' ? 'flex' : 'none';
                const usernameLabel = document.querySelector('label[for="username"]');
                const usernameInput = document.getElementById('username');
                if (usernameLabel) usernameLabel.textContent = this.currentRole === 'teacher' ? 'Usuário da professora' : 'Nome de aventureiro';
                usernameInput.placeholder = this.currentRole === 'teacher' ? 'Digite o usuário cadastrado pela professora' : 'Como você gostaria de ser chamado?';
                setupPanel.hidden = true;
                setupForm.hidden = true;
                setupOpen.hidden = false;
                loginForm.hidden = false;
                const help = document.getElementById('login-help');
                if (help) help.textContent = this.currentRole === 'teacher'
                    ? 'Verificando o acesso da professora…'
                    : 'Primeiro acesso: escolha um nome de usuário e uma senha com pelo menos 8 caracteres. Nos próximos acessos, use os mesmos dados.';

                if (this.currentRole === 'teacher') await this.refreshTeacherSetupState();
            });
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const classCode = document.getElementById('class-code').value.trim();

            if (!username || password.length < 8) {
                UI.toast('Preencha nome e senha (mínimo 8 caracteres).', 'error', '⚠️');
                return;
            }
            this.handleLogin(username, password, classCode);
        });

        setupOpen.addEventListener('click', () => {
            setupOpen.hidden = true;
            setupForm.hidden = false;
            document.getElementById('teacher-setup-username').focus();
        });

        setupCancel.addEventListener('click', () => {
            setupForm.reset();
            setupForm.hidden = true;
            setupOpen.hidden = false;
        });

        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('teacher-setup-username').value.trim();
            const password = document.getElementById('teacher-setup-password').value;
            const confirmPassword = document.getElementById('teacher-setup-confirm').value;
            if (!username || password.length < 10) {
                UI.toast('Crie um usuário e uma senha com pelo menos 10 caracteres.', 'error', '⚠️');
                return;
            }
            if (password !== confirmPassword) {
                UI.toast('A confirmação da senha não confere.', 'error', '⚠️');
                return;
            }
            const submit = document.getElementById('teacher-setup-submit');
            submit.disabled = true;
            submit.textContent = 'Criando acesso...';
            try {
                const user = await SyncApi.setupTeacher(username, password, confirmPassword);
                this.currentUser = user;
                this.currentRole = 'teacher';
                Storage.setSession({ username: user.username, role: user.role });
                UI.toast('Acesso da professora criado! Bem-vinda à Liga dos Leitores.', 'success', '📚', 5000);
                await this.enterTeacher();
            } catch (error) {
                document.getElementById('teacher-setup-message').textContent = error.message || 'Não foi possível criar a conta. Tente novamente.';
                UI.toast(error.message || 'Não foi possível criar a conta da professora.', 'error', '⚠️', 6000);
            } finally {
                submit.disabled = false;
                submit.textContent = 'Criar acesso e entrar';
            }
        });
    },

    async refreshTeacherSetupState() {
        const loginForm = document.getElementById('login-form');
        const panel = document.getElementById('teacher-setup-panel');
        const message = document.getElementById('teacher-setup-message');
        const openButton = document.getElementById('teacher-setup-open');
        const setupForm = document.getElementById('teacher-setup-form');
        const loginHelp = document.getElementById('login-help');
        try {
            const status = await SyncApi.teacherSetupStatus();
            if (status.canSetup) {
                loginForm.hidden = true;
                panel.hidden = false;
                setupForm.hidden = true;
                openButton.hidden = false;
                message.textContent = 'Ainda não existe uma conta de professora. Configure agora seu acesso neste computador. Depois disso, esta opção será desativada.';
                loginHelp.textContent = 'Para o primeiro acesso, crie uma conta exclusiva da professora. Não utilize o usuário de estudante.';
            } else if (status.configured) {
                panel.hidden = true;
                loginForm.hidden = false;
                const usernameLabel = document.querySelector('label[for="username"]');
                if (usernameLabel) usernameLabel.textContent = 'Usuário da professora';
                document.getElementById('username').placeholder = 'Digite o usuário cadastrado pela professora';
                loginHelp.textContent = 'A conta da professora já está configurada. Entre com o usuário e a senha criados no primeiro acesso. O nome “bruna” só funcionará se tiver sido exatamente esse o usuário cadastrado.';
            } else {
                loginForm.hidden = true;
                panel.hidden = false;
                setupForm.hidden = true;
                openButton.hidden = true;
                message.textContent = 'Ainda não há conta de professora, mas este navegador não parece estar no computador que executa o servidor. Abra o site no computador do servidor para configurar o primeiro acesso.';
                loginHelp.textContent = 'A configuração inicial precisa ser feita no computador que executa o servidor.';
            }
        } catch (error) {
            panel.hidden = false;
            loginForm.hidden = true;
            setupForm.hidden = true;
            openButton.hidden = true;
            message.textContent = `Não foi possível verificar o acesso da professora: ${error.message}`;
            loginHelp.textContent = 'Confira se o servidor está ligado e recarregue esta página.';
        }
    },

    async handleLogin(username, password, classCode) {
        const submit = document.querySelector('#login-form button[type="submit"]');
        submit.disabled = true;
        submit.textContent = 'Entrando...';
        try {
            const user = await SyncApi.access(username, password, this.currentRole, classCode);
            this.currentUser = user;
            Storage.setSession({ username: user.username, role: user.role });
            if (user.role === 'teacher') {
                UI.toast('Bem-vinda ao painel pedagógico!', 'success', '📚');
                await this.enterTeacher();
            } else if (user.appearance) {
                UI.toast('Bem-vindo(a) de volta à Liga!', 'success', '✨');
                this.enterGame();
            } else {
                UI.toast('Conta criada! Vamos personalizar seu personagem.', 'success', '✨');
                this.showCharacterCreation();
            }
        } catch (error) {
            const message = error.message || 'Não foi possível entrar. Verifique sua conexão.';
            const help = document.getElementById('login-help');
            if (help) help.textContent = message;
            UI.toast(message, 'error', '⚠️', 7000);
        } finally {
            submit.disabled = false;
            submit.textContent = 'Entrar ou criar conta';
        }
    },

    async logout() {
        Game.stop();
        await SyncApi.logout();
        Storage.clear();
        this.currentUser = null;
        this.showScreen('login-screen');
        document.getElementById('login-form').reset();
    },

    // ====== CRIAÇÃO DE PERSONAGEM ======
    bindCharacterScreen() {
        this.characterDraft = Characters.defaultAppearance('female');

        const canvas = document.getElementById('character-canvas');

        const redraw = () => {
            Characters.drawPortrait(canvas, this.characterDraft);
            document.getElementById('char-name-display').textContent =
                this.characterDraft.name || 'Aventureiro';
        };

        document.querySelectorAll('.avatar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.characterDraft.gender = btn.dataset.gender;
                redraw();
            });
        });

        document.getElementById('char-name').addEventListener('input', (e) => {
            this.characterDraft.name = e.target.value;
            document.getElementById('char-name-display').textContent =
                e.target.value || 'Aventureiro';
        });

        document.querySelectorAll('.color-picker').forEach(picker => {
            const target = picker.dataset.target;
            picker.querySelectorAll('.color-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    picker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.characterDraft[target] = btn.dataset.color;
                    redraw();
                });
            });
        });

        document.querySelectorAll('.accessory-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.accessory-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.characterDraft.accessory = btn.dataset.accessory;
                redraw();
            });
        });

        document.getElementById('confirm-character').addEventListener('click', () => {
            if (!this.characterDraft.name || this.characterDraft.name.length < 2) {
                UI.toast('Dê um nome para seu personagem (mínimo 2 letras).', 'error', '✍️');
                document.getElementById('char-name').focus();
                return;
            }
            this.confirmCharacter();
        });

        redraw();
    },

    showCharacterCreation(existing = null) {
        if (existing) {
            this.characterDraft = { ...existing };
            document.getElementById('char-name').value = existing.name || '';
            // Reset selections and apply existing
            document.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.gender === existing.gender);
            });
            document.querySelectorAll('.color-picker').forEach(picker => {
                const target = picker.dataset.target;
                picker.querySelectorAll('.color-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.color === existing[target]);
                });
            });
            document.querySelectorAll('.accessory-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.accessory === existing.accessory);
            });
            Characters.drawPortrait(document.getElementById('character-canvas'), existing);
            document.getElementById('char-name-display').textContent = existing.name || 'Aventureiro';
        } else {
            this.characterDraft = Characters.defaultAppearance('female');
            document.getElementById('char-name').value = '';
            document.getElementById('char-name-display').textContent = 'Aventureiro';
            document.querySelectorAll('.avatar-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.gender === 'female'));
            document.querySelectorAll('.color-picker').forEach(picker => {
                const target = picker.dataset.target;
                picker.querySelectorAll('.color-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.color === this.characterDraft[target]));
            });
            document.querySelectorAll('.accessory-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.accessory === 'none'));
            Characters.drawPortrait(document.getElementById('character-canvas'), this.characterDraft);
        }
        this.showScreen('character-screen');
    },

    async confirmCharacter() {
        const user = this.currentUser;
        if (!user) {
            UI.toast('Sua sessão não foi encontrada. Entre novamente.', 'error', '⚠️');
            this.showScreen('login-screen');
            return;
        }

        const button = document.getElementById('confirm-character');
        const originalText = button?.textContent || 'Confirmar personagem';
        if (button) { button.disabled = true; button.textContent = 'Salvando personagem...'; }

        try {
            const appearance = { ...this.characterDraft };
            user.appearance = appearance;

            // Salva o avatar na conta do estudante no servidor, para que ele
            // permaneça disponível quando a pessoa entrar em outro dispositivo.
            await SyncApi.persistProfile(user.username, appearance);
            Storage.saveUser(user.username, { appearance });
            this.currentUser.appearance = appearance;

            // Se o estudante já começou a jogar, atualiza também o estado salvo.
            const existingState = Storage.getGameState(user.username);
            if (existingState) {
                existingState.appearance = appearance;
                Storage.saveGameState(user.username, existingState);
                await SyncApi.persistGameState(user.username, existingState);
                this.enterGame();
            } else {
                this.showIntro();
            }
        } catch (error) {
            console.error('[Liga] Não foi possível salvar o personagem:', error);
            UI.toast(error.message || 'Não foi possível salvar o avatar. Verifique a conexão e tente novamente.', 'error', '⚠️', 6000);
        } finally {
            if (button) { button.disabled = false; button.textContent = originalText; }
        }
    },

    // ====== INTRO ======
    bindIntroScreen() {
        document.getElementById('skip-intro').addEventListener('click', () => this.enterGame());
        document.getElementById('start-adventure').addEventListener('click', () => this.enterGame());
    },

    showIntro() {
        this.showScreen('intro-screen');
        const name = this.characterDraft.name || this.currentUser.appearance?.name || 'aventureiro';
        const lines = [
            `Bem-vindo(a) à Liga dos Leitores, ${name}!`,
            '',
            'Muitos mundos literários estão esperando por um explorador capaz de descobrir seus segredos.',
            '',
            'Cada livro guarda pistas, personagens e desafios que apenas quem lê com atenção pode decifrar.',
            '',
            'Hoje você começa sua jornada na Praça da Liga. A partir dela, portais o levarão a mundos criados a partir de grandes obras.',
            '',
            'Seu primeiro desafio: desvendar o enigma de "A Metamorfose", de Franz Kafka.',
            '',
            'Prepare-se, aventureiro(a). Que a leitura seja seu guia!'
        ];

        const textEl = document.getElementById('intro-text');
        const skipBtn = document.getElementById('skip-intro');
        const startBtn = document.getElementById('start-adventure');

        textEl.innerHTML = '';
        startBtn.style.display = 'none';
        skipBtn.style.display = '';

        // Cada linha é adicionada uma única vez (antes o texto inteiro era recriado
        // a cada linha, reiniciando a animação e deixando as frases invisíveis)
        let i = 0;
        if (this._introTimer) clearTimeout(this._introTimer);
        const show = () => {
            if (i >= lines.length) {
                skipBtn.style.display = 'none';
                startBtn.style.display = '';
                return;
            }
            const line = lines[i];
            const el = document.createElement('div');
            if (line === '') {
                el.style.height = '8px';
            } else {
                el.textContent = line;
                el.style.cssText = 'opacity:0;animation:fadeInUp 0.6s forwards;margin-bottom:8px;';
            }
            textEl.appendChild(el);
            i++;
            this._introTimer = setTimeout(show, line === '' ? 120 : 650);
        };
        show();
    },

    // ====== JOGO ======
    enterGame() {
        const user = this.currentUser;
        if (!user.appearance) {
            this.showCharacterCreation();
            return;
        }

        this.showScreen('game-screen');

        let state = Storage.getGameState(user.username);
        if (!state) {
            const spawn = Worlds.overworld.spawn;
            const ts = Worlds.TILE_SIZE;
            state = {
                username: user.username,
                appearance: user.appearance,
                currentWorld: 'overworld',
                playerPos: { x: spawn.x * ts + ts / 2, y: spawn.y * ts + ts / 2 },
                playerDir: 'down',
                xp: 0,
                coins: 0,
                hearts: 3,
                maxHearts: 3,
                completedMissions: [],
                activeMissions: [],
                inventory: [],
                visitedPortals: ['overworld'],
                flags: {},
                stats: { missionsCorrect: 0, missionsWrong: 0 }
            };
            Storage.saveGameState(user.username, state);
        } else {
            // Garantir appearance atualizada
            state.appearance = user.appearance;
        }

        Game.start(state);
        if (!state.stats?.diagnosticInitial) {
            setTimeout(() => UI.showAssessment('initial'), 450);
        }
    },

    // ====== PROFESSORA ======
    async enterTeacher() {
        try {
            await SyncApi.refreshTeacherData();
            this.showScreen('teacher-screen');
            Teacher.enter(this.currentUser);
        } catch (error) {
            UI.toast(`Não foi possível carregar o painel: ${error.message}`, 'error', '⚠️', 5000);
            this.showScreen('login-screen');
        }
    }
};

window.App = App;

// Inicializar quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        App.init();
    } catch (error) {
        console.error('[Liga dos Leitores] Falha ao inicializar a interface:', error);
        const help = document.getElementById('login-help');
        const screen = document.getElementById('login-screen');
        if (screen) screen.classList.add('active');
        if (help) help.textContent = `A interface não conseguiu iniciar: ${error.message}. Atualize a página e, se persistir, envie esta mensagem à equipe do projeto.`;
    }
});
