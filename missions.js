/* ============================================
   LIGA DOS LEITORES — Missões Literárias
   ============================================ */

const Missions = {
    all: {
        // ====== Mundo da Metamorfose ======
        mission_1: {
            id: 'mission_1',
            worldId: 'metamorphosis',
            order: 1,
            title: 'Missão 1 — O Despertar',
            briefing: 'Grete Samsa quer entender o que aconteceu com seu irmão Gregor. Ajude-a interpretando o começo da obra.',
            npcId: 'grete',
            xpReward: 50,
            coinReward: 15,
            type: 'quiz',
            skill: 'literal',
            excerpt: {
                text: 'Quando certa manhã Gregor Samsa despertou de sonhos intranquilos, viu-se em sua cama metamorfoseado num monstruoso inseto. Deitado sobre o dorso duro como couraça, bastou-lhe levantar um pouco a cabeça para ver o próprio ventre abobadado, marrom, dividido em rígidos arcos.',
                source: 'Franz Kafka — A Metamorfose (1915)'
            },
            question: 'Qual é a primeira transformação extraordinária apresentada na narrativa?',
            options: [
                { text: 'Gregor abandona sua família por causa de brigas constantes.', correct: false, feedback: 'Observe o trecho: a narrativa começa com uma transformação física, não com um abandono.' },
                { text: 'Gregor desperta transformado em um inseto monstruoso.', correct: true, feedback: 'Correto! A obra abre com a transformação física de Gregor em inseto. Este é um dos inícios mais famosos da literatura.' },
                { text: 'A família de Gregor muda de residência durante a noite.', correct: false, feedback: 'A mudança de casa aparece bem depois na obra. O começo é marcado pela transformação de Gregor.' }
            ],
            hint: 'Preste atenção à primeira frase: "despertou de sonhos intranquilos, viu-se em sua cama metamorfoseado..."'
        },

        mission_2: {
            id: 'mission_2',
            worldId: 'metamorphosis',
            order: 2,
            title: 'Missão 2 — Pistas do Quarto',
            briefing: 'O Senhor Samsa (pai de Gregor) quer saber o que você observou ao explorar o quarto. Mostre que você sabe inferir.',
            npcId: 'father',
            xpReward: 60,
            coinReward: 20,
            type: 'quiz',
            skill: 'inferencial',
            requires: ['mission_1'],
            excerpt: {
                text: 'Antes era um ser humano produtivo, respeitado em casa e no trabalho. Agora, atrás da porta fechada, era apenas um motivo de vergonha e um fardo. A família evitava olhar para o que ele havia se tornado.',
                source: 'Franz Kafka — A Metamorfose (adaptação para contexto)'
            },
            question: 'Com base nas pistas do quarto e no trecho, o que a transformação de Gregor simboliza principalmente na obra?',
            options: [
                { text: 'Uma punição divina pelos erros de Gregor no passado.', correct: false, feedback: 'A obra de Kafka não traz julgamento religioso. A transformação é absurda, sem culpa explícita.' },
                { text: 'O desejo de Gregor de viver como um animal selvagem.', correct: false, feedback: 'Gregor permanece humano por dentro — sofre, pensa e se angustia. Não é um desejo seu.' },
                { text: 'A desumanização do indivíduo quando ele perde valor produtivo para a sociedade.', correct: true, feedback: 'Excelente! Esta é uma das leituras mais aceitas: Gregor só é valorizado enquanto produz. Ao perder essa função, torna-se um "monstro" para os próprios familiares.' },
                { text: 'Uma brincadeira infantil que foi longe demais.', correct: false, feedback: 'A obra é totalmente séria e trata de temas pesados como alienação e trabalho.' }
            ],
            hint: 'Pense: o que Gregor fazia pela família antes? Como passam a tratá-lo depois?'
        },

        mission_3: {
            id: 'mission_3',
            worldId: 'metamorphosis',
            order: 3,
            title: 'Missão Final — O Grande Enigma',
            briefing: 'A porta trancada tem um símbolo misterioso. Para abri-la, você precisa demonstrar que compreende a obra como um todo.',
            npcId: null,
            xpReward: 100,
            coinReward: 50,
            type: 'quiz',
            skill: 'interpretacao',
            requires: ['mission_1', 'mission_2'],
            excerpt: {
                text: 'Enquanto conversavam, o senhor e a senhora Samsa, ao mesmo tempo, notaram ao olhar para a filha, cada vez mais animada, que ela, apesar de todo o sofrimento das últimas semanas, florescera numa linda e bem formada jovem. Tornaram-se mais silenciosos e, quase inconscientemente comunicando-se através do olhar, pensaram que seria em breve o momento de buscar um bom marido para ela.',
                source: 'Franz Kafka — A Metamorfose (final da obra)'
            },
            question: 'O final da obra, mostrado neste trecho, revela qual mensagem sobre a família Samsa após a morte de Gregor?',
            options: [
                { text: 'A família ficou destruída e nunca se recuperou da perda.', correct: false, feedback: 'Releia o trecho: a família já pensa no futuro, sem luto profundo por Gregor.' },
                { text: 'A família rapidamente segue em frente, planejando um futuro sem Gregor como se ele tivesse sido apenas um obstáculo.', correct: true, feedback: 'Perfeito! Este é um dos aspectos mais perturbadores da obra: a família esquece Gregor com assustadora facilidade, sugerindo que ele valia apenas pela função que exercia.' },
                { text: 'Grete decide seguir uma vida religiosa em memória do irmão.', correct: false, feedback: 'A obra sugere o oposto: Grete planeja casamento e novos horizontes, sem referência ao irmão falecido.' },
                { text: 'A família descobre que Gregor estava vivo em outro lugar.', correct: false, feedback: 'Não há essa reviravolta. Gregor realmente morre e é esquecido.' }
            ],
            hint: 'Observe palavras-chave: "florescera", "silenciosos", "comunicando-se através do olhar". O que elas sugerem sobre a família?'
        }
    },

    getCustom() {
        return Storage.getCustomMissions().filter(m => m && m.published !== false);
    },

    getAll() {
        return [...Object.values(this.all), ...this.getCustom()];
    },

    get(id) {
        return this.all[id] || this.getCustom().find(m => m.id === id) || null;
    },

    getByWorld(worldId) {
        return this.getAll()
            .filter(m => m.worldId === worldId)
            .sort((a, b) => a.order - b.order);
    },

    canStart(mission, completedMissions) {
        if (!mission.requires) return true;
        return mission.requires.every(req => completedMissions.includes(req));
    }
};

window.Missions = Missions;
