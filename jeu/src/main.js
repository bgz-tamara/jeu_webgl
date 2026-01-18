// Matrice 4x4 utility
const m4 = {
    translation: (tx, ty, tz) => [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1,
    ],
    xRotation: (a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
    },
    yRotation: (a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    },
    zRotation: (a) => {
        const c = Math.cos(a), s = Math.sin(a);
        return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },
    scaling: (sx, sy, sz) => [
        sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1,
    ],
    multiply: (a, b) => {
        const r = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                r[i * 4 + j] = a[j] * b[i * 4] + a[4 + j] * b[i * 4 + 1] + 
                                a[8 + j] * b[i * 4 + 2] + a[12 + j] * b[i * 4 + 3];
            }
        }
        return r;
    },
    orthographic: (l, r, b, t, n, f) => [
        2 / (r - l), 0, 0, 0,
        0, 2 / (t - b), 0, 0,
        0, 0, 2 / (n - f), 0,
        (l + r) / (l - r), (b + t) / (b - t), (n + f) / (n - f), 1,
    ],
};

// Game State
const game = {
    turn: 1,
    maxTurns: 10,
    energy: 5,
    fun: 5,
    name: '',
    color: null,
    size: 15,
    isAnimating: false,
    animationFrame: 0,
    animationType: null,
    bgColor: [0.53, 0.81, 0.92]
};

let gl, program, positionBuffer, colorBuffer;
let positionLocation, colorLocation, matrixLocation;

// Sélection du cube
document.querySelectorAll('.cubeOption').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.cubeOption').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        game.color = opt.dataset.color;
    });
});

// Démarrer le jeu
document.getElementById('startBtn').addEventListener('click', () => {
    const name = document.getElementById('nameInput').value.trim();
    if (!name || !game.color) {
        alert('Veuillez choisir un cube et entrer un nom!');
        return;
    }
    game.name = name;
    // Initialiser avec des valeurs aléatoires entre 4 et 7
    game.energy = Math.floor(Math.random() * 2) + 4; // 4 ou 5
    game.fun = Math.floor(Math.random() * 2) + 4;    // 4 ou 5
    document.getElementById('selectionScreen').style.display = 'none';
    setupGL();
    updateMessage();
    enableButtons();
    render();
});

// Boutons d'action
document.getElementById('feedBtn').addEventListener('click', () => {
    if (game.isAnimating) return;
    
    if (game.energy > 7) {
        // Montrer mécontentement si déjà rassasié
        const oldMsg = document.getElementById('message').textContent;
        document.getElementById('message').textContent = `${game.name}: Je n'avais pas faim pourtant! 😒`;
        setTimeout(() => {
            document.getElementById('message').textContent = oldMsg;
        }, 2000);
        feed();
    } else {
        feed();
    }
});

document.getElementById('playBtn').addEventListener('click', () => {
    if (game.isAnimating) return;
    
    if (game.fun > 7) {
        // Montrer mécontentement si déjà amusé
        const oldMsg = document.getElementById('message').textContent;
        document.getElementById('message').textContent = `${game.name}: Je ne voulais pas jouer! 😒`;
        setTimeout(() => {
            document.getElementById('message').textContent = oldMsg;
        }, 2000);
        play();
    } else {
        play();
    }
});

// Bouton retour à l'accueil
document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
});

function feed() {
    const energyGain = Math.floor(Math.random() * 2) + 1;
    game.energy = Math.min(10, game.energy + energyGain);    
    const funLoss = Math.floor(Math.random() * 2) + 1; // 1 ou 2
    game.fun = Math.max(0, game.fun - funLoss);
    game.isAnimating = true;
    game.animationType = 'feed';
    game.animationFrame = 0;
    game.bgColor = [1, 0, 0];
}

function play() {
    const funGain = Math.floor(Math.random() * 2) + 1;    
    game.fun = Math.min(10, game.fun + funGain);
    const energyLoss = Math.floor(Math.random() * 2) + 1;
    game.energy = Math.max(0, game.energy - energyLoss);
    game.isAnimating = true;
    game.animationType = 'play';
    game.animationFrame = 0;
    game.bgColor = [0.58, 0, 0.83];
}

function disableButtons() {
    document.getElementById('feedBtn').disabled = true;
    document.getElementById('playBtn').disabled = true;
}

function enableButtons() {
    document.getElementById('feedBtn').disabled = false;
    document.getElementById('playBtn').disabled = false;
}

function nextTurn() {
    game.turn++;
    game.size = 15 + (game.turn - 1) * 8;
    game.bgColor = [0.53, 0.81, 0.92];
    
    console.log('Tour n°', game.turn, ' => Energie :', game.energy, 'Fun :', game.fun);
    if (game.turn > game.maxTurns) {
        endGame(true);
        return;
    }
    
    if (game.energy <= 0 || game.fun <= 0) {
        endGame(false);
        return;
    }
    
    document.getElementById('turnCounter').textContent = `Jour: ${game.turn}/${game.maxTurns}`;
    updateMessage();
}

function updateMessage() {
    let msg = `${game.name} : `;
    if (game.energy <= 4 && game.fun <= 4) {
        msg += "J'ai faim ET je m'ennuie ! 😢";
    } else if (game.energy <= 4) {
        msg += "J'ai faim! 🍔";
    } else if (game.fun <= 4) {
        msg += "Je m'ennuie ! 😴";
    } else {
        msg += "Ça va, tout va bien aujourd'hui ! 😊";
    }
    document.getElementById('message').textContent = msg;
}

function endGame(won) {
    const message = '';
    const title = won ? '🎉 Félicitations monsieur!' : '💔 C\'est perdu, vous l\'avez tué monsieur...';
    if (won) {
        message =`${game.name} a bien grandi et est heureux POUR LA VIE !`;
    } else {
        if (game.energy <= 4 && game.fun <= 4) {
                message = `${game.name} est trop triste et affamé...😢`;
            } else if (game.energy <= 4) {
                message = `${game.name} est trop affamé...🍔😢`;
            } else {
                message = `${game.name} est trop triste...😢`;
            } 
    }
    
    document.getElementById('gameOverTitle').textContent = title;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOver').style.display = 'flex';
}

function getCubeColor() {
    const colors = {
        orange: [1.0, 0.6, 0.2],
        green: [0.176, 0.961, 0.961],
        pink: [1.0, 0.2, 0.6]
    };
    return colors[game.color] || [1, 1, 1];
}

function createCube(size) {
    const s = size / 2;
    return [
        // Face avant
        -s, -s, s, s, -s, s, s, s, s, -s, -s, s, s, s, s, -s, s, s,
        // Face arrière
        -s, -s, -s, -s, s, -s, s, s, -s, -s, -s, -s, s, s, -s, s, -s, -s,
        // Face gauche
        -s, -s, -s, -s, -s, s, -s, s, s, -s, -s, -s, -s, s, s, -s, s, -s,
        // Face droite
        s, -s, -s, s, s, -s, s, s, s, s, -s, -s, s, s, s, s, -s, s,
        // Face haut
        -s, s, -s, -s, s, s, s, s, s, -s, s, -s, s, s, s, s, s, -s,
        // Face bas
        -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, -s, s, -s, s, -s, -s, s
    ];
}

function createCubeColors(baseColor) {
    const colors = [];
    const black = [0, 0, 0];
    
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            // Face avant (i === 0) : ajouter les yeux et la bouche
            if (i === 0) {
                // Coordonnées approximatives pour les traits du visage
                // Œil gauche (vertex 0 et 1)
                if (j === 0 || j === 1) {
                    colors.push(...black);
                }
                // Bouche (vertex 3)
                else if (j === 3) {
                    colors.push(...black);
                }
                else {
                    colors.push(...baseColor);
                }
            } else {
                colors.push(...baseColor);
            }
        }
    }
    return colors;
}

function setupGL() {
    const canvas = document.getElementById('canvas');
    gl = canvas.getContext('webgl');
    
    const vs = `
        attribute vec4 a_position;
        attribute vec3 a_color;
        varying vec3 v_color;
        uniform mat4 u_matrix;
        
        void main() {
            gl_Position = u_matrix * a_position;
            v_color = a_color;
        }
    `;
    
    const fs = `
        precision mediump float;
        varying vec3 v_color;
        
        void main() {
            gl_FragColor = vec4(v_color, 1.0);
        }
    `;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fs);
    gl.compileShader(fragmentShader);
    
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    positionLocation = gl.getAttribLocation(program, 'a_position');
    colorLocation = gl.getAttribLocation(program, 'a_color');
    matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    
    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

function getAnimationTransform() {
    const speed = 0.05;
    game.animationFrame += speed;
    
    let matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    
    if (game.animationType === 'feed') {
        if (game.animationFrame < Math.PI * 2) {
            matrix = m4.multiply(matrix, m4.xRotation(game.animationFrame));
        } else if (game.animationFrame < Math.PI * 4) {
            matrix = m4.multiply(matrix, m4.yRotation(game.animationFrame - Math.PI * 2));
        } else {
            game.isAnimating = false;
            disableButtons();
            setTimeout(() => {
                nextTurn();
                enableButtons();
            }, 500);
        }
    } else if (game.animationType === 'play') {
        const offset = 200;
        if (game.animationFrame < 1) {
            matrix = m4.multiply(matrix, m4.translation(-offset * game.animationFrame, 0, 0));
        } else if (game.animationFrame < 1 + Math.PI * 2) {
            matrix = m4.multiply(matrix, m4.translation(-offset, 0, 0));
            matrix = m4.multiply(matrix, m4.xRotation(game.animationFrame - 1));
        } else if (game.animationFrame < 3 + Math.PI * 2) {
            const t = game.animationFrame - 1 - Math.PI * 2;
            matrix = m4.multiply(matrix, m4.translation(-offset + offset * 2 * t, 0, 0));
        } else if (game.animationFrame < 3 + Math.PI * 4) {
            matrix = m4.multiply(matrix, m4.translation(offset, 0, 0));
            matrix = m4.multiply(matrix, m4.xRotation(game.animationFrame - 3 - Math.PI * 2));
        } else if (game.animationFrame < 4 + Math.PI * 4) {
            const t = game.animationFrame - 3 - Math.PI * 4;
            matrix = m4.multiply(matrix, m4.translation(offset - offset * t, 0, 0));
        } else {
            game.isAnimating = false;
            disableButtons();
            setTimeout(() => {
                nextTurn();
                enableButtons();
            }, 500);
        }
    }
    
    return matrix;
}

function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(...game.bgColor, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Dessiner le sol (rectangle vert)
    const groundVertices = [
        -400, -250, 0, 400, -250, 0, 400, -200, 0,
        -400, -250, 0, 400, -200, 0, -400, -200, 0
    ];
    const groundColors = Array(18).fill(0.2).map((v, i) => i % 3 === 1 ? 0.5 : v);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundVertices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundColors), gl.STATIC_DRAW);
    
    gl.useProgram(program);
    
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(colorLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    
    let matrix = m4.orthographic(-400, 400, -300, 300, 400, -400);
    gl.uniformMatrix4fv(matrixLocation, false, matrix);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Dessiner le Tomodachi
    const cubeVertices = createCube(game.size);
    const cubeColors = createCubeColors(getCubeColor());
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeColors), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    
    matrix = m4.orthographic(-400, 400, -300, 300, 400, -400);
    matrix = m4.multiply(matrix, m4.translation(0, -200 + game.size / 2, 0));
    
    if (game.isAnimating) {
        matrix = m4.multiply(matrix, getAnimationTransform());
    } else {
        matrix = m4.multiply(matrix, m4.yRotation(Date.now() * 0.0005));
    }
    
    gl.uniformMatrix4fv(matrixLocation, false, matrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    
    // Dessiner le visage (yeux et bouche)
    drawFace(matrix);
    
    requestAnimationFrame(render);
}

function drawFace(cubeMatrix) {
    const s = game.size / 2;
    const eyeSize = game.size * 0.1;
    const eyeY = game.size * 0.15;
    const eyeX = game.size * 0.2;
    const mouthWidth = game.size * 0.3;
    const mouthHeight = game.size * 0.05;
    const mouthY = -game.size * 0.2;
    
    // Œil gauche
    const leftEye = [
        -eyeX - eyeSize, eyeY - eyeSize, s + 0.1,
        -eyeX + eyeSize, eyeY - eyeSize, s + 0.1,
        -eyeX + eyeSize, eyeY + eyeSize, s + 0.1,
        -eyeX - eyeSize, eyeY - eyeSize, s + 0.1,
        -eyeX + eyeSize, eyeY + eyeSize, s + 0.1,
        -eyeX - eyeSize, eyeY + eyeSize, s + 0.1,
    ];
    
    // Œil droit
    const rightEye = [
        eyeX - eyeSize, eyeY - eyeSize, s + 0.1,
        eyeX + eyeSize, eyeY - eyeSize, s + 0.1,
        eyeX + eyeSize, eyeY + eyeSize, s + 0.1,
        eyeX - eyeSize, eyeY - eyeSize, s + 0.1,
        eyeX + eyeSize, eyeY + eyeSize, s + 0.1,
        eyeX - eyeSize, eyeY + eyeSize, s + 0.1,
    ];
    
    // Bouche
    const mouth = [
        -mouthWidth/2, mouthY - mouthHeight, s + 0.1,
        mouthWidth/2, mouthY - mouthHeight, s + 0.1,
        mouthWidth/2, mouthY + mouthHeight, s + 0.1,
        -mouthWidth/2, mouthY - mouthHeight, s + 0.1,
        mouthWidth/2, mouthY + mouthHeight, s + 0.1,
        -mouthWidth/2, mouthY + mouthHeight, s + 0.1,
    ];
    
    const faceVertices = [...leftEye, ...rightEye, ...mouth];
    const faceColors = Array(54).fill(0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(faceVertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(faceColors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.uniformMatrix4fv(matrixLocation, false, cubeMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 18);
}

function hexToWebGLColor(hex, alpha = 1.0) {
    hex = hex.replace('#', '');

    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    return [r, g, b, alpha];
}