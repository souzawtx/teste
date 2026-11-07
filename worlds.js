/* ============================================
   LIGA DOS LEITORES — Dados dos Mundos
   Mapas tile-based com colisões, NPCs e portais
   ============================================ */

const Worlds = {
    // Tamanho de cada tile em pixels
    TILE_SIZE: 48,

    /**
     * Legenda dos tiles (strings de 1 char no mapa):
     * .  = grama / piso caminhável
     * ,  = flor baixa (caminhável, decorativa)
     * -  = caminho de terra
     * =  = ponte de madeira
     * #  = parede de pedra (sólida)
     * T  = árvore (sólida)
     * B  = arbusto (sólido)
     * W  = água (sólida)
     * F  = fonte decorativa
     * S  = pedra (sólida)
     * X  = decoração especial (ex. fogueira)
     * c  = carpete (caminhável)
     * r  = tapete vermelho (caminhável)
     * s  = chão de pedra (caminhável)
     * w  = parede de madeira (sólida)
     * d  = porta (interagível/sólida se bloqueada)
     * f  = piso de madeira (caminhável)
     * b  = cama (sólida interagível)
     * m  = móvel (sólido interagível)
     * k  = livro no chão (interagível, caminhável)
     * p  = quadro na parede (sólido)
     */

    SOLID_TILES: new Set(['#', 'T', 'B', 'W', 'S', 'w', 'b', 'm', 'p', 'F']),

    overworld: {
        id: 'overworld',
        name: 'Praça da Liga',
        music: 'overworld',
        background: '#4a7c3f',
        skyColor: '#87ceeb',
        map: [
            'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
            'T.............T...............T',
            'T..,..,,..,,.T...TTTT.........T',
            'T.,.........T..T....T..###....T',
            'T.......,..T..T......T.#..#...T',
            'T..---------..T......T.#..#...T',
            'T..-........TTT......T.####...T',
            'T..-...,,......,,,.............T',
            'T..-...........................T',
            'T..-..........,...-----........T',
            'T..-..........----------.......T',
            'T..-........-........-.........T',
            'T..---------.........-.........T',
            'T............,,,,,,,,..........T',
            'T........F....................T',
            'T.............,.,.,...........T',
            'T...-----------................T',
            'T...-.........-...TTT.........T',
            'T...-.........-...T.T.........T',
            'T...-.........-..T...T........T',
            'T...-.........-..T.W.T........T',
            'T...-------------T===T........T',
            'T................T...T........T',
            'T,,...............TTT.........T',
            'T.....BBB..........,,.........T',
            'T....B...B....,,,,............T',
            'T....B...B.....,,,............T',
            'T.....BBB.....................T',
            'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
        ],
        objects: [
            // Praça central com fonte
            { type: 'landmark', x: 9, y: 14, label: 'Fonte da Praça', icon: '⛲' },

            // Portal para o mundo da Metamorfose (visitável)
            {
                type: 'portal',
                x: 14, y: 7,
                destination: 'metamorphosis',
                label: 'Portal da Metamorfose',
                color: '#9333ea',
                locked: false,
                description: 'Um portal roxo vibrante leva ao mundo de "A Metamorfose"'
            },

            // Portal para a biblioteca (interface in-game)
            {
                type: 'building',
                x: 23, y: 4,
                label: 'Biblioteca Central',
                icon: '📚',
                action: 'library',
                description: 'Uma biblioteca iluminada guarda todas as obras literárias'
            },

            // Torre das Conquistas
            {
                type: 'building',
                x: 2, y: 25,
                label: 'Torre das Conquistas',
                icon: '🏆',
                action: 'achievements',
                description: 'Uma torre antiga exibe as conquistas dos aventureiros'
            },

            // Mercado Literário
            {
                type: 'building',
                x: 25, y: 24,
                label: 'Mercado Literário',
                icon: '🛒',
                action: 'shop',
                description: 'Um pequeno mercado oferece itens para aventureiros'
            },

            // NPCs
            {
                type: 'npc',
                x: 12, y: 11,
                npcId: 'mentor',
                name: 'Mestre Lívia',
                portrait: '👩‍🏫',
                dialog: [
                    'Bem-vindo(a) à Liga dos Leitores, aventureiro(a)!',
                    'Eu sou a Mestre Lívia e vou guiá-lo em sua jornada literária.',
                    'Nossa missão é explorar mundos criados a partir de grandes obras da literatura.',
                    'Para começar, atravesse o Portal da Metamorfose, ao norte da praça.',
                    'Use as setas ou WASD para caminhar. Pressione E (ou toque no botão) para interagir.',
                    'Boa sorte! Que a leitura seja seu guia!'
                ]
            },
            {
                type: 'npc',
                x: 7, y: 20,
                npcId: 'bard',
                name: 'Bardo Anselmo',
                portrait: '🎭',
                dialog: [
                    'Olá, viajante! Eu sou o Bardo Anselmo.',
                    'Dizem que cada livro é um mundo esperando ser descoberto.',
                    'Em "A Metamorfose", um homem acorda transformado em um inseto gigante.',
                    'Imagine só: como você se sentiria no lugar dele?',
                    'Essa é a mágica da literatura — nos faz pensar e sentir junto com os personagens!'
                ]
            },
            {
                type: 'npc',
                x: 20, y: 15,
                npcId: 'guard',
                name: 'Guardião Felix',
                portrait: '⚔️',
                dialog: [
                    'Olá! Eu cuido do caminho para novos mundos.',
                    'Por enquanto, apenas o mundo da Metamorfose está aberto.',
                    'Em breve, outras obras serão liberadas: Vidas Secas, O Alienista, Iracema...',
                    'Cada mundo que você explorar vai ensinar algo novo sobre leitura e interpretação!',
                    'Volte sempre que conquistar mais conhecimento literário.'
                ]
            },

            // Portais bloqueados (futuros mundos)
            {
                type: 'portal',
                x: 26, y: 11,
                destination: null,
                label: 'Portal do Diário',
                icon: '📔',
                color: '#8b4513',
                locked: true,
                description: 'Portal bloqueado - "O Diário de Anne Frank" será liberado em breve'
            },
            {
                type: 'portal',
                x: 4, y: 11,
                destination: null,
                label: 'Portal do Sertão',
                icon: '🌵',
                color: '#d97706',
                locked: true,
                description: 'Portal bloqueado - "Vidas Secas" será liberado em breve'
            },

            // Placas informativas
            {
                type: 'sign',
                x: 14, y: 13,
                label: 'Placa',
                text: '"Bem-vindo à Praça da Liga. Explore os caminhos de pedra para descobrir os mundos literários!"'
            },
            {
                type: 'sign',
                x: 10, y: 17,
                label: 'Placa',
                text: '"Siga ao sul para a Torre das Conquistas. Siga a leste para o Mercado."'
            },
        ],
        spawn: { x: 10, y: 15 }, // posição inicial em tiles
    },

    metamorphosis: {
        id: 'metamorphosis',
        name: 'O Enigma da Metamorfose',
        music: 'mystery',
        background: '#2a1810',
        skyColor: '#4a3a30',
        map: [
            'wwwwwwwwwwwwwwwwwwwwwww',
            'w.ffffff.wwwww.ffffff.w',
            'w.fbbbbf.w...w.fkkkkf.w',
            'w.fbbbbf.w...w.fkkkkf.w',
            'w.ffffff.w...w.ffffff.w',
            'w........w...w........w',
            'wwdwwwwwww...wwwwwdwwww',
            'w....................w',
            'w.ffffffff.ffffffff..w',
            'w.ffffffff.ffffffff..w',
            'w.ffffffff.ffffffff..w',
            'w.ffffffff.ffffffff..w',
            'w....................w',
            'wwwwwwwdwwwwwwwdwwwwww',
            'w.ffffff...ffffff....w',
            'w.ffbbff...ffmmff....w',
            'w.ffffff...ffffff....w',
            'w....................w',
            'wwwwwwwwwwwwwwwwwwwwww',
        ],
        objects: [
            // Cama de Gregor (quarto principal)
            {
                type: 'interactive',
                x: 3, y: 3,
                label: 'Cama de Gregor',
                icon: '🛏️',
                dialog: [
                    'A cama está desarrumada. Marcas estranhas podem ser vistas nos lençóis...',
                    'Parece que algo grande e inquieto esteve aqui.',
                    '[Objeto importante da história: é aqui que Gregor desperta transformado]'
                ],
                missionTag: 'bed_examined'
            },

            // Livro/diário no segundo quarto
            {
                type: 'interactive',
                x: 15, y: 3,
                label: 'Diário sobre a Mesa',
                icon: '📓',
                dialog: [
                    'Um diário aberto registra os sentimentos de Gregor:',
                    '"Trabalho sem parar para sustentar minha família, mas sinto que não me vêem como pessoa, apenas como fonte de sustento."',
                    '[Pista literária: o drama interno de Gregor é central na obra]'
                ],
                missionTag: 'diary_read'
            },

            // Porta trancada (desafio final)
            {
                type: 'door',
                x: 7, y: 6,
                label: 'Porta do Mistério',
                locked: true,
                missionTag: 'main_mission',
                dialog: [
                    'A porta está trancada. Um símbolo misterioso aparece na madeira.',
                    'Parece que você precisa compreender melhor a obra para abri-la.'
                ]
            },

            // Porta de saída (sempre aberta)
            {
                type: 'door',
                x: 15, y: 6,
                label: 'Porta de Saída',
                destination: 'overworld',
                dialog: ['Esta porta leva de volta à Praça da Liga.']
            },

            // NPC: narrador do mundo
            {
                type: 'npc',
                x: 11, y: 10,
                npcId: 'narrator',
                name: 'Espectro Narrador',
                portrait: '👻',
                dialog: [
                    'Ahhh... bem-vindo ao mundo de "A Metamorfose".',
                    'Esta é a obra-prima de Franz Kafka, publicada em 1915.',
                    'Nela, Gregor Samsa, um caixeiro-viajante, acorda transformado em um inseto monstruoso.',
                    'Sua tarefa aqui é explorar os cenários, encontrar pistas e responder desafios de interpretação.',
                    'Comece examinando a cama (quarto da esquerda) e o diário (quarto da direita).',
                    'Depois, encontre o irmão de Grete para iniciar seu primeiro desafio.'
                ]
            },

            // NPC: Grete (irmã de Gregor)
            {
                type: 'npc',
                x: 3, y: 15,
                npcId: 'grete',
                name: 'Grete Samsa',
                portrait: '👧',
                missionId: 'mission_1',
                dialog: [
                    'Oh, visitante... você veio ajudar?',
                    'Meu irmão Gregor mudou tanto... não sei mais como lidar com isso.',
                    'Você consegue me ajudar a entender o que aconteceu com ele?'
                ]
            },

            // NPC: Pai de Gregor
            {
                type: 'npc',
                x: 15, y: 15,
                npcId: 'father',
                name: 'Senhor Samsa',
                portrait: '🧓',
                missionId: 'mission_2',
                dialog: [
                    'Hmpf... visitante inesperado.',
                    'Meu filho Gregor sempre foi o pilar desta família. Trabalhava sem descanso.',
                    'Agora tudo mudou. E eu... eu não sei como me sinto.',
                    'Se você entende de literatura, me ajude a compreender esta situação.'
                ]
            },

            // Objeto decorativo: carta
            {
                type: 'interactive',
                x: 8, y: 9,
                label: 'Carta Esquecida',
                icon: '📜',
                dialog: [
                    'Uma carta amassada. Alguém a jogou com raiva.',
                    'Diz: "A família não pode mais sustentar-se com Gregor nesse estado. Precisamos tomar uma decisão..."',
                    '[Pista: o conflito familiar é tão forte quanto a transformação física]'
                ]
            },

            // Pista: maçã (referência ao livro)
            {
                type: 'interactive',
                x: 18, y: 9,
                label: 'Maçã no Chão',
                icon: '🍎',
                dialog: [
                    'Uma maçã estranhamente colocada no chão...',
                    'Na obra, o pai de Gregor atira maçãs contra ele em um momento de fúria.',
                    'Uma delas o fere mortalmente.',
                    '[Objeto simbólico: representa a rejeição familiar]'
                ],
                missionTag: 'apple_found'
            },
        ],
        spawn: { x: 11, y: 7 },
    }
};

// Normaliza cada mapa como uma grade retangular. Linhas menores recebem parede
// no limite direito; linhas excedentes são cortadas para manter colisão e câmera alinhadas.
for (const worldId of ['overworld', 'metamorphosis']) {
    const world = Worlds[worldId];
    const width = world.map[0]?.length || 0;
    const boundary = worldId === 'metamorphosis' ? 'w' : 'T';
    world.map = world.map.map(row => String(row).slice(0, width).padEnd(width, boundary));
}

// ====== Utilitários de mundo ======
Worlds.isSolid = function(worldId, tileX, tileY) {
    const world = this[worldId];
    if (!world) return true;
    const row = world.map[tileY];
    if (!row) return true;
    const tile = row[tileX];
    if (!tile) return true;
    return this.SOLID_TILES.has(tile);
};

Worlds.getTile = function(worldId, tileX, tileY) {
    const world = this[worldId];
    if (!world) return null;
    const row = world.map[tileY];
    if (!row) return null;
    return row[tileX] || null;
};

Worlds.getObjectAt = function(worldId, tileX, tileY) {
    const world = this[worldId];
    if (!world) return null;
    return world.objects.find(o => o.x === tileX && o.y === tileY) || null;
};

Worlds.getNearbyObject = function(worldId, pxX, pxY, radius = 60) {
    const world = this[worldId];
    if (!world) return null;
    const ts = this.TILE_SIZE;
    let closest = null;
    let closestDist = Infinity;
    for (const obj of world.objects) {
        const ox = obj.x * ts + ts / 2;
        const oy = obj.y * ts + ts / 2;
        const dx = ox - pxX;
        const dy = oy - pxY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && dist < closestDist) {
            closestDist = dist;
            closest = obj;
        }
    }
    return closest;
};

window.Worlds = Worlds;
