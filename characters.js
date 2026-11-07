/* ============================================
   LIGA DOS LEITORES — Desenho de Personagens
   Avatares procedurais em canvas
   ============================================ */

// Polyfill para CanvasRenderingContext2D.roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') r = [r, r, r, r];
        else if (Array.isArray(r)) {
            if (r.length === 2) r = [r[0], r[1], r[0], r[1]];
            else if (r.length === 3) r = [r[0], r[1], r[2], r[1]];
        } else r = [0, 0, 0, 0];
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
        this.lineTo(x + r[3], y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
        this.lineTo(x, y + r[0]);
        this.quadraticCurveTo(x, y, x + r[0], y);
    };
}

const Characters = {
    LEVELS: [
        { level: 1, name: 'Aprendiz', xpRequired: 0 },
        { level: 2, name: 'Explorador', xpRequired: 100 },
        { level: 3, name: 'Investigador', xpRequired: 250 },
        { level: 4, name: 'Guardião', xpRequired: 500 },
        { level: 5, name: 'Mestre Literário', xpRequired: 1000 },
        { level: 6, name: 'Lenda da Literatura', xpRequired: 2000 },
    ],

    getLevelInfo(xp) {
        let current = this.LEVELS[0];
        let next = null;
        for (let i = 0; i < this.LEVELS.length; i++) {
            if (xp >= this.LEVELS[i].xpRequired) {
                current = this.LEVELS[i];
                next = this.LEVELS[i + 1] || null;
            }
        }
        const currentXp = xp - current.xpRequired;
        const neededXp = next ? next.xpRequired - current.xpRequired : 0;
        return {
            level: current.level,
            name: current.name,
            currentXp,
            neededXp,
            totalXp: xp,
            next
        };
    },

    defaultAppearance(gender = 'female') {
        return {
            gender,
            outfit: '#7c3aed',
            hair: '#2a1810',
            skin: '#f1c295',
            accessory: 'none',
            name: ''
        };
    },

    /**
     * Desenha o personagem em um canvas estilo retrato (frente).
     * Usado na tela de criação e no HUD.
     */
    drawPortrait(canvas, appearance, options = {}) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const groundY = h * 0.95;

        if (options.showGround !== false) {
            // Chão/sombra
            const grad = ctx.createRadialGradient(cx, groundY, 10, cx, groundY, w * 0.4);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, groundY, w * 0.3, h * 0.03, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Proporções
        const scale = Math.min(w, h) / 320;
        const headR = 36 * scale;
        const bodyW = 60 * scale;
        const bodyH = 90 * scale;
        const headY = h * 0.3;

        this._drawCharacterFront(ctx, cx, headY, scale, appearance);
    },

    _drawCharacterFront(ctx, cx, headY, scale, a) {
        const skin = a.skin;
        const hair = a.hair;
        const outfit = a.outfit;
        const isFemale = a.gender === 'female';

        // Pernas
        const legY = headY + 110 * scale;
        ctx.fillStyle = '#2a1810';
        ctx.beginPath();
        ctx.roundRect(cx - 18 * scale, legY, 14 * scale, 42 * scale, 3 * scale);
        ctx.roundRect(cx + 4 * scale, legY, 14 * scale, 42 * scale, 3 * scale);
        ctx.fill();

        // Sapatos
        ctx.fillStyle = '#1a0f08';
        ctx.beginPath();
        ctx.roundRect(cx - 20 * scale, legY + 40 * scale, 18 * scale, 10 * scale, 4 * scale);
        ctx.roundRect(cx + 2 * scale, legY + 40 * scale, 18 * scale, 10 * scale, 4 * scale);
        ctx.fill();

        // Corpo (túnica)
        const bodyGrad = ctx.createLinearGradient(cx, headY + 40 * scale, cx, legY);
        bodyGrad.addColorStop(0, this._lighten(outfit, 10));
        bodyGrad.addColorStop(1, this._darken(outfit, 20));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        if (isFemale) {
            // Vestido mais largo embaixo
            ctx.moveTo(cx - 24 * scale, headY + 40 * scale);
            ctx.lineTo(cx + 24 * scale, headY + 40 * scale);
            ctx.lineTo(cx + 36 * scale, legY);
            ctx.lineTo(cx - 36 * scale, legY);
            ctx.closePath();
        } else {
            ctx.roundRect(cx - 26 * scale, headY + 40 * scale, 52 * scale, 70 * scale, [4 * scale, 4 * scale, 2 * scale, 2 * scale]);
        }
        ctx.fill();

        // Detalhe cinto
        ctx.fillStyle = this._darken(outfit, 40);
        ctx.fillRect(cx - 28 * scale, headY + 95 * scale, 56 * scale, 5 * scale);

        // Fivela dourada
        ctx.fillStyle = '#f0c060';
        ctx.fillRect(cx - 4 * scale, headY + 94 * scale, 8 * scale, 7 * scale);

        // Braços
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(cx - 36 * scale, headY + 42 * scale, 14 * scale, 50 * scale, 4 * scale);
        ctx.roundRect(cx + 22 * scale, headY + 42 * scale, 14 * scale, 50 * scale, 4 * scale);
        ctx.fill();

        // Mãos
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(cx - 29 * scale, headY + 95 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 29 * scale, headY + 95 * scale, 7 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Pescoço
        ctx.fillStyle = this._darken(skin, 15);
        ctx.fillRect(cx - 8 * scale, headY + 32 * scale, 16 * scale, 12 * scale);

        // Cabeça
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(cx, headY, 28 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo
        ctx.fillStyle = hair;
        if (isFemale) {
            // Mechas longas que descem pelos lados, sem cobrir o rosto
            const k = scale;
            ctx.beginPath();
            ctx.moveTo(cx - 27 * k, headY - 6 * k);
            ctx.quadraticCurveTo(cx - 36 * k, headY + 20 * k, cx - 30 * k, headY + 46 * k);
            ctx.lineTo(cx - 19 * k, headY + 46 * k);
            ctx.quadraticCurveTo(cx - 25 * k, headY + 22 * k, cx - 24 * k, headY + 2 * k);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 27 * k, headY - 6 * k);
            ctx.quadraticCurveTo(cx + 36 * k, headY + 20 * k, cx + 30 * k, headY + 46 * k);
            ctx.lineTo(cx + 19 * k, headY + 46 * k);
            ctx.quadraticCurveTo(cx + 25 * k, headY + 22 * k, cx + 24 * k, headY + 2 * k);
            ctx.closePath();
            ctx.fill();
            // Topo da cabeça com franja varrida, sempre acima das sobrancelhas
            ctx.beginPath();
            ctx.moveTo(cx - 29 * k, headY - 2 * k);
            ctx.arc(cx, headY, 29 * k, Math.PI, 2 * Math.PI);
            ctx.lineTo(cx + 29 * k, headY - 2 * k);
            ctx.quadraticCurveTo(cx + 16 * k, headY - 19 * k, cx + 2 * k, headY - 18 * k);
            ctx.quadraticCurveTo(cx - 16 * k, headY - 17 * k, cx - 29 * k, headY - 2 * k);
            ctx.closePath();
            ctx.fill();
        } else {
            // Cabelo curto masculino
            ctx.beginPath();
            ctx.arc(cx, headY - 2 * scale, 30 * scale, Math.PI, 2 * Math.PI);
            ctx.lineTo(cx + 30 * scale, headY + 4 * scale);
            ctx.lineTo(cx + 22 * scale, headY - 8 * scale);
            ctx.lineTo(cx - 22 * scale, headY - 8 * scale);
            ctx.lineTo(cx - 30 * scale, headY + 4 * scale);
            ctx.closePath();
            ctx.fill();
        }

        // Olhos
        const eyeY = headY - 2 * scale;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx - 9 * scale, eyeY, 4 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 9 * scale, eyeY, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a0f08';
        ctx.beginPath();
        ctx.arc(cx - 9 * scale, eyeY + 0.5 * scale, 2.2 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 9 * scale, eyeY + 0.5 * scale, 2.2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Brilho olho
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(cx - 8 * scale, eyeY - 0.5 * scale, 0.7 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 10 * scale, eyeY - 0.5 * scale, 0.7 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Sobrancelhas
        ctx.strokeStyle = hair;
        ctx.lineWidth = 2 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 13 * scale, eyeY - 8 * scale);
        ctx.lineTo(cx - 5 * scale, eyeY - 9 * scale);
        ctx.moveTo(cx + 5 * scale, eyeY - 9 * scale);
        ctx.lineTo(cx + 13 * scale, eyeY - 8 * scale);
        ctx.stroke();

        // Boca
        ctx.strokeStyle = this._darken(skin, 50);
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(cx, headY + 10 * scale, 5 * scale, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Bochechas
        ctx.fillStyle = 'rgba(220, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(cx - 15 * scale, headY + 6 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 15 * scale, headY + 6 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Acessórios
        if (a.accessory === 'hat') {
            ctx.fillStyle = '#4c2a7a';
            ctx.beginPath();
            ctx.ellipse(cx, headY - 25 * scale, 36 * scale, 6 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - 20 * scale, headY - 25 * scale);
            ctx.lineTo(cx + 20 * scale, headY - 25 * scale);
            ctx.lineTo(cx + 14 * scale, headY - 55 * scale);
            ctx.lineTo(cx - 14 * scale, headY - 55 * scale);
            ctx.closePath();
            ctx.fill();
            // Estrela no chapéu
            ctx.fillStyle = '#f0c060';
            this._drawStar(ctx, cx, headY - 42 * scale, 5 * scale, 2 * scale, 5);
        } else if (a.accessory === 'glasses') {
            ctx.strokeStyle = '#1a0f08';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.arc(cx - 9 * scale, eyeY, 7 * scale, 0, Math.PI * 2);
            ctx.arc(cx + 9 * scale, eyeY, 7 * scale, 0, Math.PI * 2);
            ctx.moveTo(cx - 2 * scale, eyeY);
            ctx.lineTo(cx + 2 * scale, eyeY);
            ctx.stroke();
        } else if (a.accessory === 'backpack') {
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.roundRect(cx - 20 * scale, headY + 48 * scale, 40 * scale, 36 * scale, 4 * scale);
            ctx.fill();
            ctx.fillStyle = '#f0c060';
            ctx.fillRect(cx - 2 * scale, headY + 56 * scale, 4 * scale, 20 * scale);
        }
    },

    /**
     * Desenha um sprite de corpo inteiro (vista superior/isométrica para o mapa).
     * Tamanho padrão 32x40 na tela do jogo.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - canto superior esquerdo
     * @param {number} y
     * @param {object} appearance
     * @param {string} direction - 'down', 'up', 'left', 'right'
     * @param {number} frame - 0,1,2 (passo)
     * @param {number} scale
     */
    drawSprite(ctx, x, y, appearance, direction = 'down', frame = 0, scale = 1) {
        const a = appearance;
        const skin = a.skin;
        const hair = a.hair;
        const outfit = a.outfit;
        const isFemale = a.gender === 'female';

        // Centro do sprite
        const cx = x + 16 * scale;
        const headY = y + 10 * scale;

        // Walk cycle: offset de passo
        const stepOffset = frame === 1 ? -2 : (frame === 2 ? 2 : 0);
        const bodyY = headY + 10 * scale;

        // Sombra
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, y + 40 * scale, 12 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pernas
        ctx.fillStyle = '#2a1810';
        if (frame === 1) {
            ctx.fillRect(cx - 7 * scale, bodyY + 20 * scale, 5 * scale, 12 * scale);
            ctx.fillRect(cx + 2 * scale, bodyY + 18 * scale, 5 * scale, 14 * scale);
        } else if (frame === 2) {
            ctx.fillRect(cx - 7 * scale, bodyY + 18 * scale, 5 * scale, 14 * scale);
            ctx.fillRect(cx + 2 * scale, bodyY + 20 * scale, 5 * scale, 12 * scale);
        } else {
            ctx.fillRect(cx - 7 * scale, bodyY + 20 * scale, 5 * scale, 12 * scale);
            ctx.fillRect(cx + 2 * scale, bodyY + 20 * scale, 5 * scale, 12 * scale);
        }

        // Corpo
        const bodyGrad = ctx.createLinearGradient(cx, bodyY, cx, bodyY + 20 * scale);
        bodyGrad.addColorStop(0, this._lighten(outfit, 10));
        bodyGrad.addColorStop(1, this._darken(outfit, 15));
        ctx.fillStyle = bodyGrad;

        if (isFemale) {
            ctx.beginPath();
            ctx.moveTo(cx - 8 * scale, bodyY);
            ctx.lineTo(cx + 8 * scale, bodyY);
            ctx.lineTo(cx + 10 * scale, bodyY + 20 * scale);
            ctx.lineTo(cx - 10 * scale, bodyY + 20 * scale);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(cx - 8 * scale, bodyY, 16 * scale, 20 * scale);
        }

        // Braços (laterais)
        ctx.fillStyle = outfit;
        if (direction === 'left' || direction === 'right') {
            // só um braço visível de lado
            ctx.fillRect(cx - 2 * scale, bodyY + 2 * scale, 4 * scale, 16 * scale);
        } else {
            const armSwing = frame === 1 ? -1 : (frame === 2 ? 1 : 0);
            ctx.fillRect(cx - 11 * scale, bodyY + 2 * scale + armSwing, 4 * scale, 16 * scale);
            ctx.fillRect(cx + 7 * scale, bodyY + 2 * scale - armSwing, 4 * scale, 16 * scale);
        }

        // Mãos
        ctx.fillStyle = skin;
        if (direction === 'left' || direction === 'right') {
            ctx.beginPath();
            ctx.arc(cx, bodyY + 18 * scale, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(cx - 9 * scale, bodyY + 18 * scale, 2 * scale, 0, Math.PI * 2);
            ctx.arc(cx + 9 * scale, bodyY + 18 * scale, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cabeça
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(cx, headY, 8 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Cabelo
        ctx.fillStyle = hair;
        if (direction === 'up') {
            // De costas: cabelo cobre tudo
            ctx.beginPath();
            ctx.arc(cx, headY, 8 * scale, 0, Math.PI * 2);
            ctx.fill();
            if (isFemale) {
                ctx.fillRect(cx - 7 * scale, headY - 2 * scale, 14 * scale, 14 * scale);
            }
        } else {
            // Franja/topo
            ctx.beginPath();
            ctx.arc(cx, headY - 2 * scale, 8 * scale, Math.PI, 2 * Math.PI);
            if (isFemale) {
                // Franja acima dos olhos + mechas laterais (rosto sempre visível)
                ctx.lineTo(cx + 8 * scale, headY - 1 * scale);
                ctx.quadraticCurveTo(cx, headY - 4 * scale, cx - 8 * scale, headY - 1 * scale);
            } else {
                ctx.lineTo(cx + 8 * scale, headY + 1 * scale);
                ctx.lineTo(cx + 6 * scale, headY - 3 * scale);
                ctx.lineTo(cx - 6 * scale, headY - 3 * scale);
                ctx.lineTo(cx - 8 * scale, headY + 1 * scale);
            }
            ctx.closePath();
            ctx.fill();

            if (isFemale) {
                ctx.fillStyle = hair;
                if (direction === 'left') {
                    ctx.fillRect(cx + 2 * scale, headY - 3 * scale, 6 * scale, 14 * scale);
                } else if (direction === 'right') {
                    ctx.fillRect(cx - 8 * scale, headY - 3 * scale, 6 * scale, 14 * scale);
                } else {
                    ctx.fillRect(cx - 9 * scale, headY - 3 * scale, 3 * scale, 13 * scale);
                    ctx.fillRect(cx + 6 * scale, headY - 3 * scale, 3 * scale, 13 * scale);
                }
            }
        }

        // Rosto
        if (direction !== 'up') {
            // Olhos
            ctx.fillStyle = '#1a0f08';
            if (direction === 'left') {
                ctx.fillRect(cx - 4 * scale, headY, 1.5 * scale, 2 * scale);
            } else if (direction === 'right') {
                ctx.fillRect(cx + 2 * scale, headY, 1.5 * scale, 2 * scale);
            } else {
                ctx.fillRect(cx - 3 * scale, headY, 1.5 * scale, 2 * scale);
                ctx.fillRect(cx + 1.5 * scale, headY, 1.5 * scale, 2 * scale);
                ctx.fillStyle = this._darken(skin, 40);
                ctx.fillRect(cx - 1 * scale, headY + 4 * scale, 2 * scale, 1 * scale);
            }
        }

        // Acessório — chapéu
        if (a.accessory === 'hat') {
            ctx.fillStyle = '#4c2a7a';
            ctx.fillRect(cx - 10 * scale, headY - 10 * scale, 20 * scale, 2 * scale);
            ctx.beginPath();
            ctx.moveTo(cx - 7 * scale, headY - 10 * scale);
            ctx.lineTo(cx + 7 * scale, headY - 10 * scale);
            ctx.lineTo(cx + 4 * scale, headY - 18 * scale);
            ctx.lineTo(cx - 4 * scale, headY - 18 * scale);
            ctx.closePath();
            ctx.fill();
        }

        if (a.accessory === 'backpack' && direction !== 'up') {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(cx - 7 * scale, bodyY + 4 * scale, 14 * scale, 10 * scale);
        }
    },

    _drawStar(ctx, cx, cy, outerR, innerR, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    },

    _lighten(hex, pct) {
        return this._adjustColor(hex, pct);
    },

    _darken(hex, pct) {
        return this._adjustColor(hex, -pct);
    },

    _adjustColor(hex, pct) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const adjust = (c) => {
            const v = pct > 0
                ? c + (255 - c) * (pct / 100)
                : c + c * (pct / 100);
            return Math.max(0, Math.min(255, Math.round(v)));
        };
        const toHex = (v) => v.toString(16).padStart(2, '0');
        return '#' + toHex(adjust(r)) + toHex(adjust(g)) + toHex(adjust(b));
    }
};

window.Characters = Characters;
