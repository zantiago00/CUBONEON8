/**
 * Script para el juego Cuadrado Saltarín Combo + Ranking
 * Incorpora mejoras de estructura, manejo de clases, delta time y limpieza.
 * Versión Corregida: 2025-04-06
 */

// --- REFERENCIAS A ELEMENTOS DEL DOM (con Optional Chaining donde sea útil) ---
const player = document.getElementById('player');
const container = document.getElementById('gameContainer');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const comboEl = document.getElementById('combo');

// Pantallas y Formularios
const welcomeScreen = document.getElementById('welcomeScreen');
const emailScreen = document.getElementById('emailScreen');
const emailForm = document.getElementById('emailForm');
const initialEmailInput = document.getElementById('initialEmail');

const registerScreen = document.getElementById('registerScreen');
const registerForm = document.getElementById('registerForm');
const startScreen = document.getElementById('startScreen');
const rankingDisplayScreen = document.getElementById('rankingDisplay');

// Botones, Inputs y Elementos UI
const welcomeStartBtn = document.getElementById('welcomeStartBtn');
const startButton = document.getElementById('startButton');
const playerNameInput = document.getElementById('playerName');
const playerEmailInput = document.getElementById('playerEmail');
const rankingDiv = document.getElementById('ranking');
const finalScoreTextEl = document.getElementById('finalScoreText');
const restartButton = document.getElementById('restartButton');
// const registerButton = document.getElementById('registerButton'); // El submit del form es suficiente

// CORRECCIÓN: Obtener referencia directa para visibilidad controlada por JS/CSS
const mobileInstructions = startScreen?.querySelector('.mobile-instructions');
const orientationMessage = document.getElementById('orientation-message');

// Elementos de Términos y Condiciones
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTermsBtn');
const closeBtn = termsModal?.querySelector('.close-btn');
const acceptTermsBtn = termsModal?.querySelector('#acceptTermsBtn');
const termsCheckbox = document.getElementById('termsCheckbox');

// --- CONSTANTES DE CONFIGURACIÓN ---
// Física y Movimiento (Valores por segundo donde aplique)
const GRAVITY_ACCEL = 1800; // Aceleración pixels/s^2 (Ajustado para delta time)
const INITIAL_JUMP_VELOCITY = 700; // Velocidad inicial pixels/s (Ajustado para delta time)
const JUMP_COMBO_MULTIPLIER = 1.1; // Multiplicador salto con combo >= 3
const DOUBLE_JUMP_VELOCITY_MULTIPLIER = 1.1; // Multiplicador velocidad doble salto
const GROUND_Y = 0; // Posición del suelo

// Velocidad del Juego (Pixels por segundo)
const BASE_SPEED = 420; // Velocidad base pixels/s (7px/frame @ 60fps -> 420px/s)
const SPEED_MULTIPLIER_COMBO3 = 1.2; // Multiplicador de velocidad con combo >= 3
const SPEED_MULTIPLIER_COMBO6 = 1.5; // Multiplicador de velocidad con combo >= 6
const SPEED_BOOST_MULTIPLIER = 1.5; // Multiplicador durante boost temporal
const SPEED_BOOST_DURATION_S = 5; // Segundos que dura el boost temporal

// Tiempo y Puntuación
const INITIAL_TIME_S = 120; // Segundos
const MAX_TIME_CAP_S = INITIAL_TIME_S + 30; // Tiempo máximo acumulable
const OBSTACLE_HIT_PENALTY_S = 1; // Segundos restados al chocar
const COIN_SCORE_MULTIPLIER = 5; // Puntos por moneda = MULTIPLIER * combo actual
const POINTS_PER_OBSTACLE_DODGED = 1; // Puntos por esquivar

// Ranking
const RANKING_URL = "https://script.google.com/macros/s/AKfycbzBUuj5qYyp9PnnP83ofKBGwStiqmk8ixX4CcQiPZWAevi1_vB6rqiXtYioXM4GcnHidw/exec"; // URL del Ranking API
const RANKING_MAX_NAME_LENGTH = 15;
const RANKING_TOP_N = 20;

// Configuración de generación de elementos (Intervalos en milisegundos)
const OBSTACLE_BASE_INTERVAL_MS = 1800; // Intervalo base entre obstáculos
const OBSTACLE_MIN_GAP_TIME_MS = 600; // Tiempo mínimo absoluto entre obstáculos (depende de la velocidad)
const OBSTACLE_RATE_DECREASE_FACTOR = 0.97; // Factor de reducción de intervalo por combo
const MAX_CONSECUTIVE_OBSTACLES = 3; // Máximo número de obstáculos seguidos
const CONSECUTIVE_OBSTACLE_BREAK_MULTIPLIER = 1.5; // Multiplica intervalo después de MAX_CONSECUTIVE
const COIN_BASE_INTERVAL_MS = 2500; // Intervalo base entre monedas
const MIN_COIN_INTERVAL_TIME_MS = 1800; // Tiempo mínimo absoluto entre monedas
const COIN_INTERVAL_RANDOMNESS_MS = 1000; // Aleatoriedad añadida al intervalo de monedas
const COIN_INTERVAL_COMBO6_MULTIPLIER = 0.75; // Reduce intervalo con combo >= 6
const MIN_OBSTACLE_VISUAL_GAP_PX = 100; // Espacio visual mínimo (px) entre obstáculos dobles

// Probabilidades (0 a 1)
const OBSTACLE_LARGE_CHANCE = 0.3; // Probabilidad de obstáculo grande con combo >= 3
const OBSTACLE_DOUBLE_CHANCE = 0.4; // Probabilidad de obstáculo doble con combo >= 3
// const OBSTACLE_DOUBLE_LARGE_CHANCE = 0.5; // Probabilidad de que el segundo sea grande (No implementado directamente en la lógica actual)

// Animaciones y UI
const FLOATING_TEXT_DURATION_MS = 1200; // Duración animación texto flotante (+ CSS)
const WELCOME_TRANSITION_DURATION_MS = 500; // Duración animación salida welcome screen (debe coincidir con CSS)
const HIT_EFFECT_DURATION_MS = 300; // Duración efecto hit/shake
const JUMP_EFFECT_DURATION_MS = 200; // Duración clase .jumping
const COLLECT_EFFECT_DURATION_MS = 200; // Duración clase .collected

// --- VARIABLES DE ESTADO DEL JUEGO ---
let gameRunning = false;
let score = 0;
let combo = 0;
let gameTime = INITIAL_TIME_S;
let gameLoopId = null; // Para requestAnimationFrame
let obstacleTimeoutId = null; // Para setTimeout de obstáculos
let coinTimeoutId = null; // Para setTimeout de monedas

let playerName = "Anónimo";
let playerEmail = "";

// Estado del jugador
let playerY = 0; // Posición vertical (pixels desde abajo)
let velocityY = 0; // Velocidad vertical (pixels/s)
let isJumping = false; // Está en el aire por un salto
let canDoubleJump = false; // Poder de doble salto activo

// Elementos dinámicos
let obstacles = []; // Array de { element: HTMLElement, width: number, height: number }
let coins = []; // Array de { element: HTMLElement, type: string, bonus: number, width: number, height: number }

// Estado de velocidad y tiempo
let currentSpeed = BASE_SPEED; // Velocidad actual (pixels/s)
let speedBoostActive = false;
let boostEndTime = 0; // Timestamp (ms) de cuando termina el boost
let lastTimestamp = 0; // Para cálculo de delta time

// Estado de generación
let lastObstacleSpawnTime = 0;
let consecutiveObstacles = 0;
let lastCoinSpawnTime = 0;

// Otros
let resizeTimeout = null; // Para debounce de resize/orientation

// --- CLASES CSS PARA ESTADOS ---
const HIDDEN_CLASS = 'screen--hidden'; // Clase para ocultar elementos
const VISUALLY_HIDDEN_CLASS = 'visually-hidden'; // Para labels de accesibilidad
const TRANSITION_OUT_CLASS = 'transition-out'; // Para animación de salida

// --- FUNCIONES AUXILIARES ---

// Función para detectar si es un dispositivo móvil
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Función para mostrar/ocultar elementos usando clases CSS
function setElementVisibility(element, isVisible) {
    if (!element) return;
    if (isVisible) {
        element.classList.remove(HIDDEN_CLASS);
    } else {
        element.classList.add(HIDDEN_CLASS);
    }
}

// Función para escapar HTML simple (prevención XSS básica)
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- FUNCIONES DE ADAPTACIÓN RESPONSIVA ---

// Ajustar el contenedor del juego según el entorno y dispositivo
function adjustGameContainer() {
    // La lógica de tamaño del contenedor se maneja principalmente por CSS
    // Esta función ahora se enfoca en la lógica JS dependiente del tamaño/orientación

    if (isMobileDevice()) {
        // Prevenir scroll/zoom global en móviles podría hacerse en CSS con touch-action: none en body/html
        // document.documentElement.style.touchAction = 'none'; // Considerar hacerlo en CSS

        // Mostrar/Ocultar mensaje de orientación
        const isPortrait = window.innerHeight > window.innerWidth;
        setElementVisibility(orientationMessage, isPortrait);
        if (orientationMessage) {
             orientationMessage.setAttribute('aria-hidden', String(!isPortrait));
        }

        // Pausar/Reanudar juego si se implementa pausa en modo retrato
        // if (isPortrait && gameRunning) pauseGame();
        // else if (!isPortrait && wasPaused) resumeGame();

    } else {
        setElementVisibility(orientationMessage, false); // Ocultar mensaje en escritorio
        if (orientationMessage) {
             orientationMessage.setAttribute('aria-hidden', 'true');
        }
    }
}

// Función para manejar el debounce del resize/orientation
function debouncedAdjustGameContainer() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(adjustGameContainer, 150); // Espera 150ms
}

// --- FUNCIONES DE GESTIÓN DE PANTALLAS Y FORMULARIOS ---

function showScreen(screenToShow) {
    // Oculta todas las pantallas principales
    [welcomeScreen, emailScreen, registerScreen, startScreen, rankingDisplayScreen].forEach(screen => {
        if (screen) { // Verificar que la referencia no sea null
             setElementVisibility(screen, false);
        }
    });
    // Muestra la pantalla deseada (si existe)
    if (screenToShow) {
        setElementVisibility(screenToShow, true);
        // Podríamos añadir foco al primer elemento interactivo aquí si es necesario
    }
}

// Funciones para el modal de términos y condiciones
function openTermsModal() {
    if (termsModal) {
        termsModal.style.display = "block"; // El modal usa display directo
        termsModal.setAttribute('aria-hidden', 'false');
        acceptTermsBtn?.focus(); // Poner foco en botón aceptar
    }
}
function closeTermsModal() {
    if (termsModal) {
        termsModal.style.display = "none";
        termsModal.setAttribute('aria-hidden', 'true');
        // Devolver foco al botón que abrió el modal si es posible
        openTermsBtn?.focus();
    }
}
function acceptTerms() {
    if (termsCheckbox) {
         termsCheckbox.checked = true;
         // Disparar evento change por si hay validación ligada a él
         termsCheckbox.dispatchEvent(new Event('change'));
    }
    closeTermsModal();
}

// Manejo del formulario de correo inicial
function handleEmailSubmit(e) {
    e.preventDefault();
    if (!initialEmailInput || !playerEmailInput) return;

    const email = initialEmailInput.value.trim().toLowerCase(); // Normalizar

    // Validación básica de correo (expresión regular simple)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        alert("Por favor, ingresa un correo electrónico válido.");
        initialEmailInput.focus();
        return;
    }

    playerEmail = email;
    playerEmailInput.value = email; // Pre-rellenar en pantalla de registro
    playerEmailInput.readOnly = true; // Marcar como no editable
    // El estilo readonly se aplica desde CSS

    showScreen(registerScreen);
    playerNameInput?.focus(); // Foco en el nombre
}

// Manejo del formulario de registro
function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!playerNameInput || !playerEmailInput || !termsCheckbox) return;

    const name = playerNameInput.value.trim();

    if (!name) {
        alert("Por favor, ingresa tu nombre de jugador.");
        playerNameInput.focus();
        return;
    }
    // Doble chequeo de email (por si acaso)
    if (!playerEmailInput.value) {
        alert("Error con el correo. Por favor, vuelve a la pantalla inicial.");
        showScreen(emailScreen);
        initialEmailInput?.focus();
        return;
    }
    if (!termsCheckbox.checked) {
        alert("Debes aceptar los términos y condiciones para continuar.");
        // Considerar abrir modal automáticamente: openTermsModal();
        return;
    }

    playerName = name.substring(0, RANKING_MAX_NAME_LENGTH); // Guardar y limitar longitud
    playerNameInput.value = playerName; // Actualizar input por si se cortó

    showScreen(startScreen);
    startButton?.focus(); // Foco en el botón Jugar
}

// --- LÓGICA PRINCIPAL DEL JUEGO ---

function startGame() {
    if (gameRunning) return;
    console.log("Iniciando juego...");

    gameRunning = true;
    lastTimestamp = 0; // Resetear para cálculo de delta time

    // Resetear estado
    score = 0; combo = 0; gameTime = INITIAL_TIME_S;
    obstacles = []; coins = [];
    playerY = GROUND_Y; velocityY = 0; isJumping = false;
    canDoubleJump = false;
    speedBoostActive = false; boostEndTime = 0; currentSpeed = BASE_SPEED;
    lastObstacleSpawnTime = 0; consecutiveObstacles = 0; lastCoinSpawnTime = 0;

    // Limpiar elementos de partida anterior del DOM
    container?.querySelectorAll('.obstacle, .coin, .floating-text').forEach(el => el.remove());

    // Resetear estado visual del jugador y contenedor
    if (player) {
        player.style.bottom = `${playerY}px`;
        player.className = 'player'; // Quita .powered, .jumping, .collected
    }
    container?.classList.remove('hit', 'shake');

    updateUI();
    clearScheduledSpawns(); // Limpiar timeouts de spawns anteriores

    // Programar generación inicial (con pequeño delay inicial)
    obstacleTimeoutId = setTimeout(scheduleNextObstacle, 500);
    coinTimeoutId = setTimeout(scheduleNextCoin, 1500);

    // Iniciar bucle de juego
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(updateGame);

    showScreen(null); // Ocultar todas las pantallas principales
}

function updateGame(timestamp) {
    if (!gameRunning) return;

    // Calcular Delta Time
    if (lastTimestamp === 0) { // Primer frame
        lastTimestamp = timestamp;
        gameLoopId = requestAnimationFrame(updateGame);
        return;
    }
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Delta time en segundos
    lastTimestamp = timestamp;

    // --- Actualizaciones basadas en Delta Time ---

    // Actualizar tiempo de juego
    gameTime = Math.max(0, gameTime - deltaTime);

    // Actualizar velocidad (dependiente del tiempo, no del frame)
    updateSpeed(timestamp); // timestamp necesario para check de boost

    // Actualizar física del jugador (dependiente del tiempo)
    updatePlayerPhysics(deltaTime);

    // Mover obstáculos y monedas (dependiente del tiempo)
    moveObstacles(deltaTime);
    moveCoins(deltaTime);

    // --- Comprobaciones y Lógica de Estado ---
    checkCollisions(); // Comprobar colisiones después de mover todo
    checkOutOfBounds(); // Comprobar si salieron de pantalla

    // Actualizar UI (Score, Timer, Combo)
    updateUI();

    // Comprobar fin de juego por tiempo
    if (gameTime <= 0) {
        gameOver();
        return; // Salir del bucle
    }

    // Solicitar el próximo frame
    gameLoopId = requestAnimationFrame(updateGame);
}

function updateSpeed(currentTime) {
    // Revisar boost temporal
    if (speedBoostActive && currentTime >= boostEndTime) {
        speedBoostActive = false;
        console.log("Speed boost terminado");
        // Podría añadirse efecto visual al terminar boost
    }

    // Determinar multiplicador base
    let speedMultiplier = 1;
    if (combo >= 6) {
        speedMultiplier = SPEED_MULTIPLIER_COMBO6;
    } else if (combo >= 3) {
        speedMultiplier = SPEED_MULTIPLIER_COMBO3;
    }

    // Aplicar boost si está activo
    if (speedBoostActive) {
        speedMultiplier *= SPEED_BOOST_MULTIPLIER;
    }

    currentSpeed = BASE_SPEED * speedMultiplier;
}

function updatePlayerPhysics(deltaTime) {
    if (!player) return;

    // Aplicar gravedad V = V0 + a*t
    velocityY -= GRAVITY_ACCEL * deltaTime;

    // Actualizar posición Y = Y0 + v*t
    playerY += velocityY * deltaTime;

    // Comprobar suelo
    if (playerY <= GROUND_Y) {
        playerY = GROUND_Y;
        velocityY = 0;
        if (isJumping) {
            isJumping = false;
            // Quitar clase .jumping se maneja en jump() con timeout
        }
    }
    player.style.bottom = `${playerY}px`;
}

function jump() {
    if (!gameRunning || !player) return;

    const baseJumpVelocity = INITIAL_JUMP_VELOCITY;
    const comboJumpMultiplier = (combo >= 3) ? JUMP_COMBO_MULTIPLIER : 1;
    const currentJumpVelocity = baseJumpVelocity * comboJumpMultiplier;

    // Salto Normal (solo si está en el suelo)
    if (!isJumping && playerY === GROUND_Y) {
        isJumping = true;
        velocityY = currentJumpVelocity;
        player.classList.add('jumping');
        // Quitar clase después de un tiempo para efecto visual
        setTimeout(() => { player?.classList.remove('jumping'); }, JUMP_EFFECT_DURATION_MS);
        console.log("Jump!");
    }
    // Doble Salto (solo si ya está saltando Y tiene el poder)
    else if (isJumping && canDoubleJump) {
        velocityY = currentJumpVelocity * DOUBLE_JUMP_VELOCITY_MULTIPLIER; // Impulso extra
        canDoubleJump = false; // Consumir poder
        player.classList.remove('powered'); // Quitar efecto visual amarillo
        player.classList.add('jumping'); // Reaplicar efecto visual de salto
        setTimeout(() => { player?.classList.remove('jumping'); }, JUMP_EFFECT_DURATION_MS);
        console.log("Double Jump!");
    }
}

// --- GENERACIÓN DE OBSTÁCULOS ---

function scheduleNextObstacle() {
    if (!gameRunning) return;

    const now = Date.now();
    let baseInterval = OBSTACLE_BASE_INTERVAL_MS;

    // Ajustar intervalo por combo (más rápido con más combo)
    if (combo >= 3) {
        baseInterval *= Math.pow(OBSTACLE_RATE_DECREASE_FACTOR, Math.min(10, combo - 2)); // Limita efecto
    }

    // Forzar respiro si hubo muchos obstáculos seguidos
    if (consecutiveObstacles >= MAX_CONSECUTIVE_OBSTACLES) {
        baseInterval *= CONSECUTIVE_OBSTACLE_BREAK_MULTIPLIER;
        consecutiveObstacles = 0; // Resetear contador para el próximo ciclo
        console.log("Forzando pausa obstáculos");
    }

    // Calcular delay asegurando el mínimo y compensando tiempo pasado
    const timeSinceLast = now - lastObstacleSpawnTime;
    // El delay mínimo ahora depende de la velocidad actual para evitar solapamientos imposibles
    const minGapTimeAdjusted = (container.offsetWidth / currentSpeed) * 1000 * 0.3 + OBSTACLE_MIN_GAP_TIME_MS; // Estimación tiempo cruce + gap minimo
    const delay = Math.max(minGapTimeAdjusted, baseInterval - timeSinceLast);

    obstacleTimeoutId = setTimeout(() => {
        spawnObstacle();
        lastObstacleSpawnTime = Date.now();
        scheduleNextObstacle(); // Programar el siguiente
    }, delay);
}

function spawnObstacle() {
    if (!gameRunning || !container) return;

    const obsData = createObstacleElement();
    if (!obsData) return;

    obstacles.push(obsData);
    container.appendChild(obsData.element);
    consecutiveObstacles++;

    // Posibilidad de generar un segundo obstáculo cercano
    if (combo >= 3 && Math.random() < OBSTACLE_DOUBLE_CHANCE && consecutiveObstacles < MAX_CONSECUTIVE_OBSTACLES) {
        const firstObstacleWidth = obsData.element.offsetWidth; // Leer ancho real del primer obstáculo
        const secondObsData = createObstacleElement(firstObstacleWidth);
        if (secondObsData) {
            obstacles.push(secondObsData);
            container.appendChild(secondObsData.element);
            consecutiveObstacles++;
            console.log("Obstáculo doble generado");
        }
    }
}

// Helper para crear un elemento obstáculo (sin setear tamaño, usa CSS)
function createObstacleElement(previousObstacleWidth = 0) {
    const element = document.createElement('div');
    element.className = 'obstacle'; // Clase base

    // Posibilidad de hacerlo grande (añadir clase)
    const isLarge = (combo >= 3 && Math.random() < OBSTACLE_LARGE_CHANCE);
    if (isLarge) {
        element.classList.add('large');
    }

    // Calcular posición inicial X (derecha, fuera de pantalla)
    let initialLeft = container.offsetWidth; // Justo fuera del borde derecho
    if (previousObstacleWidth > 0) {
        // Si es el segundo obstáculo, añadir gap visual
        const gap = MIN_OBSTACLE_VISUAL_GAP_PX + Math.random() * 50; // Gap aleatorio
        initialLeft += previousObstacleWidth + gap;
    }
    element.style.left = `${initialLeft}px`;
    element.style.bottom = `${GROUND_Y}px`; // Asegurar posición Y

    // Devolvemos el elemento y placeholder para width/height (se leerán si es necesario)
    return { element, width: 0, height: 0 };
}

// --- GENERACIÓN DE MONEDAS ---

function scheduleNextCoin() {
    if (!gameRunning) return;

    const now = Date.now();
    let baseInterval = COIN_BASE_INTERVAL_MS;

    // Ajustar intervalo por combo (más rápido con combo 6+)
    if (combo >= 6) {
        baseInterval *= COIN_INTERVAL_COMBO6_MULTIPLIER;
    }
    baseInterval += Math.random() * COIN_INTERVAL_RANDOMNESS_MS;

    // Calcular delay asegurando el mínimo y compensando tiempo pasado
    const timeSinceLast = now - lastCoinSpawnTime;
    const delay = Math.max(MIN_COIN_INTERVAL_TIME_MS, baseInterval - timeSinceLast);

    coinTimeoutId = setTimeout(() => {
        spawnCoin();
        lastCoinSpawnTime = Date.now();
        scheduleNextCoin(); // Programar la siguiente
    }, delay);
}

function spawnCoin() {
    if (!gameRunning || !container) return;

    let type = 'green';
    let bonus = 1; // Segundos añadidos
    if (combo >= 6 && Math.random() < 0.5) { // 50% chance amarilla con combo 6+
         type = 'yellow'; bonus = 5;
    } else if (combo >= 3 && Math.random() < 0.5) { // 50% chance azul con combo 3+
         type = 'blue'; bonus = 2;
    } // else: verde por defecto

    const coinData = createCoinElement(type, bonus);
    if (!coinData) return;

    coins.push(coinData);
    container.appendChild(coinData.element);
}

// Helper para crear un elemento moneda (sin setear tamaño, usa CSS)
function createCoinElement(type, bonus) {
    const element = document.createElement('div');
    element.className = `coin ${type}`; // Clases para estilo CSS

    element.style.left = `${container.offsetWidth + Math.random() * 150}px`; // Posición X inicial aleatoria fuera

    // Calcular posición Y segura (evitar suelo y techo)
    const containerHeight = container.offsetHeight;
    const playerMaxHeightApprox = containerHeight * 0.4; // Estimar altura max salto jugador
    const safeBottomMin = 50; // Mínimo Y
    const safeBottomMax = Math.min(containerHeight * 0.7, containerHeight - 80); // Máximo Y
    // Intentar ponerla en una altura alcanzable pero variada
    const randomBottom = safeBottomMin + Math.random() * (Math.min(playerMaxHeightApprox, safeBottomMax) - safeBottomMin);
    element.style.bottom = `${randomBottom}px`;

    // Placeholder para width/height
    return { element, type, bonus, width: 0, height: 0 };
}

// --- MOVIMIENTO Y COLISIONES ---

function moveObstacles(deltaTime) {
    const deltaX = currentSpeed * deltaTime; // Distancia a mover en este frame
    obstacles.forEach(obs => {
        if (obs.element && obs.element.isConnected) {
            obs.element.style.left = `${parseFloat(obs.element.style.left) - deltaX}px`;
        }
    });
}

function moveCoins(deltaTime) {
    const deltaX = currentSpeed * deltaTime; // Distancia a mover en este frame
    coins.forEach(coin => {
         if (coin.element && coin.element.isConnected) {
            coin.element.style.left = `${parseFloat(coin.element.style.left) - deltaX}px`;
        }
    });
}

function checkCollisions() {
    if (!player) return;
    const playerRect = player.getBoundingClientRect();

    // Colisiones con Obstáculos
    obstacles = obstacles.filter(obs => {
        if (!obs.element || !obs.element.isConnected) return false; // Limpiar si ya no está
        if (checkCollision(playerRect, obs.element.getBoundingClientRect(), -10)) { // Margen negativo
            handleObstacleCollision(obs.element);
            return false; // Eliminar de la lista
        }
        return true; // Mantener en la lista
    });

    // Colisiones con Monedas
    coins = coins.filter(coin => {
        if (!coin.element || !coin.element.isConnected) return false;
        if (checkCollision(playerRect, coin.element.getBoundingClientRect(), 5)) { // Margen positivo
            handleCoinCollection(coin.element, coin); // Pasar coinData completo
            return false; // Eliminar de la lista
        }
        return true;
    });
}

function checkOutOfBounds() {
    const containerWidth = container?.offsetWidth ?? 0;

    // Eliminar obstáculos que salieron por la izquierda
    obstacles = obstacles.filter(obs => {
        if (!obs.element || !obs.element.isConnected) return false;
        const elementLeft = parseFloat(obs.element.style.left);
        const elementWidth = obs.width || obs.element.offsetWidth; // Leer ancho real si no lo teníamos
        if (elementLeft < -elementWidth) {
            score += POINTS_PER_OBSTACLE_DODGED; // Punto por esquivar
            obs.element.remove();
            // No es necesario updateUI aquí, se hace en el loop principal
            return false;
        }
        // Actualizar width/height en el objeto si no lo teníamos
        if (obs.width === 0) obs.width = elementWidth;
        if (obs.height === 0) obs.height = obs.element.offsetHeight;
        return true;
    });

    // Eliminar monedas que salieron por la izquierda
    coins = coins.filter(coin => {
        if (!coin.element || !coin.element.isConnected) return false;
        const elementLeft = parseFloat(coin.element.style.left);
        const elementWidth = coin.width || coin.element.offsetWidth;
        if (elementLeft < -elementWidth) {
            coin.element.remove();
            return false;
        }
        if (coin.width === 0) coin.width = elementWidth;
        if (coin.height === 0) coin.height = coin.element.offsetHeight;
        return true;
    });
}


// Función de chequeo de colisión AABB (Axis-Aligned Bounding Box)
function checkCollision(rect1, rect2, margin = 0) {
    // Necesita objetos con top, bottom, left, right
    // getBoundingClientRect() los proporciona
    if (!rect1 || !rect2) return false;

    return (
        rect1.left < rect2.right + margin &&
        rect1.right > rect2.left - margin &&
        rect1.top < rect2.bottom + margin &&
        rect1.bottom > rect2.top - margin
    );
}

function handleObstacleCollision(obstacleElement) {
    console.log("Colisión con obstáculo!");
    gameTime = Math.max(0, gameTime - OBSTACLE_HIT_PENALTY_S);
    combo = 0; // Resetear combo
    consecutiveObstacles = 0; // Resetear contador de seguidos al fallar
    speedBoostActive = false; // Perder boost temporal
    if (canDoubleJump) { // Perder doble salto persistente
        canDoubleJump = false;
        player?.classList.remove('powered');
    }
    // updateUI(); // Se actualiza en el loop principal

    // Feedback visual de colisión
    container?.classList.add('hit', 'shake');
    setTimeout(() => { container?.classList.remove('hit', 'shake'); }, HIT_EFFECT_DURATION_MS);

    // Texto flotante de penalización
    try {
        const rect = obstacleElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        showFloatingText(
            rect.left - containerRect.left + rect.width / 2,
            rect.top - containerRect.top - 10, // Un poco arriba del obstáculo
            `-${OBSTACLE_HIT_PENALTY_S}s`,
            false // false = minus
        );
    } catch (e) { console.error("Error mostrando texto flotante (hit):", e); }

    obstacleElement.remove(); // Eliminar el obstáculo colisionado
}

function handleCoinCollection(coinElement, coinData) {
    console.log(`Moneda recogida: ${coinData.type}`);
    combo++;
    gameTime = Math.min(MAX_TIME_CAP_S, gameTime + coinData.bonus); // Añadir tiempo con límite
    score += COIN_SCORE_MULTIPLIER * combo; // Puntos basados en combo
    // updateUI(); // Se actualiza en el loop principal

    // Aplicar efectos especiales de la moneda
    if (coinData.type === 'blue' || coinData.type === 'yellow') {
        speedBoostActive = true;
        boostEndTime = Date.now() + (SPEED_BOOST_DURATION_S * 1000); // Marcar cuándo termina
        console.log("Speed boost activado");
    }
    if (coinData.type === 'yellow') {
        canDoubleJump = true; // Otorgar doble salto persistente
        player?.classList.add('powered'); // Efecto visual amarillo
        console.log("Doble salto persistente activado");
    }

    // Feedback visual de recolección
    player?.classList.add('collected');
    setTimeout(() => player?.classList.remove('collected'), COLLECT_EFFECT_DURATION_MS);

    // Texto flotante de bonus
    try {
        const rect = coinElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        showFloatingText(
            rect.left - containerRect.left + rect.width / 2,
            rect.top - containerRect.top - 10,
            `+${coinData.bonus}s`,
            true // true = plus
        );
    } catch (e) { console.error("Error mostrando texto flotante (coin):", e); }

    coinElement.remove(); // Eliminar la moneda recolectada
}


// --- UTILIDADES (Texto Flotante, UI, Limpieza) ---

function showFloatingText(x, y, text, isPositive) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = `floating-text ${isPositive ? 'plus' : 'minus'}`;
    el.textContent = text;

    // Posición (ajustada para centrar aproximadamente)
    // Medir el texto es más preciso pero costoso. Usamos estimación simple.
    const textWidthEstimate = text.length * 12; // Ajustar multiplicador si es necesario
    el.style.left = `${x - textWidthEstimate / 2}px`;
    el.style.top = `${y}px`;

    // Añadir al contenedor y eliminar después de la animación
    container.appendChild(el);
    setTimeout(() => { el?.remove(); }, FLOATING_TEXT_DURATION_MS);
}

function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (timerEl) timerEl.textContent = gameTime.toFixed(1); // Mostrar 1 decimal
    if (comboEl) comboEl.textContent = `Combo: ${combo}`;
}

function clearScheduledSpawns() {
    clearTimeout(obstacleTimeoutId);
    clearTimeout(coinTimeoutId);
    obstacleTimeoutId = null;
    coinTimeoutId = null;
}

// --- FIN DE JUEGO Y RANKING ---

async function gameOver() {
    if (!gameRunning) return; // Evitar doble llamada
    console.log("Juego terminado! Puntuación final:", score);
    gameRunning = false;

    // Detener bucle y generación
    clearScheduledSpawns();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = null;

    // Mostrar pantalla de fin de juego y mensaje inicial
    if(finalScoreTextEl) finalScoreTextEl.textContent = `${playerName || 'Jugador'}, tu puntuación: ${score}`;
    if(rankingDiv) rankingDiv.innerHTML = "<p>Enviando puntuación y cargando ranking...</p>";
    showScreen(rankingDisplayScreen);
    restartButton?.focus(); // Poner foco en botón reiniciar

    // --- Envío y Carga de Ranking ---
    // Nota: Se usa GET con parámetros por simplicidad (común en Apps Script).
    //       POST sería más adecuado para enviar datos, especialmente el email.
    const requestParams = new URLSearchParams({
        nombre: playerName.substring(0, RANKING_MAX_NAME_LENGTH), // Asegurar longitud max
        email: playerEmail,
        puntaje: score
    });
    const urlEnviar = `${RANKING_URL}?${requestParams.toString()}`;

    let rankingData = null;
    let sendError = null;
    let fetchError = null;

    console.log("Enviando puntuación a:", RANKING_URL); // No mostrar URL completa con datos
    const sendPromise = fetch(urlEnviar)
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP ${response.status} al enviar`);
             console.log("Puntuación enviada correctamente.");
             return response.text(); // O .json() si la API devuelve algo útil
        })
        .catch(err => {
            console.error("Error al enviar puntuación:", err);
            sendError = err;
        });

    console.log("Obteniendo ranking de:", RANKING_URL);
    const fetchPromise = fetch(RANKING_URL) // GET para obtener ranking
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP ${response.status} al obtener ranking`);
            return response.json();
        })
        .then(data => {
             console.log("Ranking recibido:", data);
             rankingData = data;
        })
        .catch(err => {
            console.error("Error al obtener ranking:", err);
            fetchError = err;
        });

    // Esperar a que ambas operaciones terminen
    await Promise.allSettled([sendPromise, fetchPromise]); // Usar allSettled para continuar incluso si una falla

    // Si el juego se reinició mientras cargaba, no actualizar la pantalla de ranking
    if (gameRunning || !rankingDisplayScreen || rankingDisplayScreen.classList.contains(HIDDEN_CLASS)) {
        console.log("Actualización de ranking cancelada (juego reiniciado o pantalla oculta).");
        return;
    }

    // Procesar y mostrar el ranking (o errores)
    displayRanking(rankingData, sendError, fetchError);
}

function displayRanking(data, sendErr, fetchErr) {
    if (!rankingDiv) return; // Salir si el div no existe

    if (fetchErr) { // Priorizar error de carga
        rankingDiv.innerHTML = `<p>No se pudo cargar el ranking (${fetchErr.message}). Verifica tu conexión.</p>`;
        if (sendErr) {
            rankingDiv.innerHTML += `<p style='color:red; font-size:0.8em;'>Tampoco se pudo guardar tu puntuación (${sendErr.message}).</p>`;
        } else {
             rankingDiv.innerHTML += `<p style='color:orange; font-size:0.8em;'>Tu puntuación sí fue enviada, pero el ranking no está disponible.</p>`;
        }
    } else if (Array.isArray(data)) { // Si se obtuvieron datos y es un array
        try {
            const topPlayers = data
                .map(r => ({ // Mapear y limpiar/validar datos
                    // Usar optional chaining y valores por defecto
                    nombre: String(r?.nombre || "???").substring(0, RANKING_MAX_NAME_LENGTH),
                    // Convertir a número asegurándose de que sea válido
                    puntaje: Number(String(r?.puntaje || '0').replace(/[^\d.-]/g, '')) || 0
                }))
                .filter(r => !isNaN(r.puntaje) && r.puntaje >= 0) // Filtrar NaN y negativos
                .sort((a, b) => b.puntaje - a.puntaje) // Ordenar descendente
                .slice(0, RANKING_TOP_N); // Tomar el Top N

            // Construir tabla HTML
            let tableHTML = '<h2>Ranking Top 20</h2><table><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th></tr></thead><tbody>';
            if (topPlayers.length > 0) {
                topPlayers.forEach((r, i) => {
                    tableHTML += `<tr><td>${i + 1}</td><td>${escapeHTML(r.nombre)}</td><td>${r.puntaje}</td></tr>`;
                });
            } else {
                tableHTML += '<tr><td colspan="3">Ranking vacío o no disponible.</td></tr>';
            }
            tableHTML += '</tbody></table>';
            rankingDiv.innerHTML = tableHTML;

            // Añadir nota si hubo error al enviar pero el ranking cargó
            if (sendErr) {
                rankingDiv.innerHTML += `<p style='color:orange; font-size:0.8em;'>Nota: No se pudo confirmar el guardado de tu puntuación (${sendErr.message}), pero el ranking se cargó.</p>`;
            }

        } catch (processingError) {
            console.error("Error al procesar datos del ranking:", processingError);
            rankingDiv.innerHTML = "<p>Error al mostrar el ranking. Intenta de nuevo más tarde.</p>";
        }
    } else { // Caso: No hubo error de fetch, pero los datos no son un array
         console.warn("Los datos del ranking recibidos no son un array:", data);
         rankingDiv.innerHTML = "<p>Formato de ranking inesperado.</p>";
          if (sendErr) {
                rankingDiv.innerHTML += `<p style='color:red; font-size:0.8em;'>Error al guardar tu puntuación (${sendErr.message}).</p>`;
            }
    }
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

function initializeGame() {
    console.log("Inicializando juego...");
    // Ajuste inicial de tamaño/orientación
    adjustGameContainer();

    // CORRECCIÓN: Mostrar pantalla de bienvenida primero
    showScreen(welcomeScreen);
    // Ocultar instrucciones móviles inicialmente (se mostrarán si es móvil)
    setElementVisibility(mobileInstructions, false);
    // Ocultar mensaje de orientación inicialmente (JS lo controla después)
    setElementVisibility(orientationMessage, false);
    if(orientationMessage) orientationMessage.setAttribute('aria-hidden', 'true');


    // Mostrar instrucciones móviles si aplica
    if (isMobileDevice() && mobileInstructions) {
        setElementVisibility(mobileInstructions, true);
    }

    // Poner foco inicial (si la pantalla de bienvenida está visible)
    welcomeStartBtn?.focus();

    // --- Bind Event Listeners (con optional chaining) ---

    // Botón Comenzar (Welcome Screen)
    welcomeStartBtn?.addEventListener('click', () => {
        if (welcomeScreen && emailScreen) {
            welcomeScreen.classList.add(TRANSITION_OUT_CLASS);
            // Esperar que termine la animación CSS antes de cambiar pantalla
            setTimeout(() => {
                showScreen(emailScreen); // Mostrar pantalla de email
                welcomeScreen.classList.remove(TRANSITION_OUT_CLASS); // Limpiar clase
                initialEmailInput?.focus(); // Poner foco en input de email
            }, WELCOME_TRANSITION_DURATION_MS);
        } else {
            // Fallback si algo falla
            showScreen(emailScreen);
            initialEmailInput?.focus();
        }
    });

    // Formularios
    emailForm?.addEventListener('submit', handleEmailSubmit);
    registerForm?.addEventListener('submit', handleRegisterSubmit);

    // Botones de acción
    startButton?.addEventListener('click', startGame);
    restartButton?.addEventListener('click', () => {
        // Solo reiniciar si el juego NO está corriendo y estamos en pantalla de ranking
        if (!gameRunning && rankingDisplayScreen && !rankingDisplayScreen.classList.contains(HIDDEN_CLASS)) {
            rankingDiv.innerHTML = ""; // Limpiar contenido del ranking anterior
            finalScoreTextEl.textContent = "";
            showScreen(startScreen); // Volver a la pantalla de inicio del juego
            startButton?.focus();
        }
    });

    // Modal Términos y Condiciones
    openTermsBtn?.addEventListener('click', (e) => {
        e.preventDefault(); // Evitar que el enlace '#' navegue
        openTermsModal();
    });
    closeBtn?.addEventListener('click', closeTermsModal);
    acceptTermsBtn?.addEventListener('click', acceptTerms);
    // Cerrar modal al hacer clic fuera del contenido
    termsModal?.addEventListener('click', (e) => {
        if (e.target === termsModal) { // Si el clic fue sobre el fondo del modal
            closeTermsModal();
        }
    });

    // Controles del Juego (Teclado y Táctil)
    document.addEventListener('keydown', (e) => {
        // Saltar con Espacio durante el juego
        if (gameRunning && (e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
            e.preventDefault(); // Evitar scroll de página
            jump();
        }
        // Iniciar juego con Enter/Espacio desde StartScreen (si está visible)
        else if (!gameRunning && startScreen && !startScreen.classList.contains(HIDDEN_CLASS) && (e.key === 'Enter' || e.keyCode === 13 || e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
            e.preventDefault();
            startGame();
        }
        // Reiniciar juego con Enter/Espacio desde RankingScreen (si está visible)
        else if (!gameRunning && rankingDisplayScreen && !rankingDisplayScreen.classList.contains(HIDDEN_CLASS) && (e.key === 'Enter' || e.keyCode === 13 || e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
            e.preventDefault();
            restartButton?.click(); // Simular clic en botón reiniciar
        }
        // Aceptar términos con Enter si el botón tiene foco
        else if (termsModal && termsModal.style.display === 'block' && document.activeElement === acceptTermsBtn && (e.key === 'Enter' || e.keyCode === 13)) {
             e.preventDefault();
             acceptTerms();
        }
         // Cerrar modal con Escape
        else if (termsModal && termsModal.style.display === 'block' && (e.key === 'Escape' || e.keyCode === 27)) {
             closeTermsModal();
        }
    });

    // Controles Táctiles (dentro del contenedor del juego)
    container?.addEventListener('touchstart', (e) => {
        // Saltar si el juego está activo y el toque NO es sobre un botón/enlace/input/modal
        if (gameRunning && !e.target.closest('button, a, input, .modal')) {
            jump();
            // No prevenir default aquí para permitir scroll en ranking si fuera necesario
            // e.preventDefault();
        }
    }, { passive: true }); // passive: true porque no usamos preventDefault aquí

    // Prevenir scroll con touchmove *durante el juego* en móviles
    if (isMobileDevice()) {
        document.body.addEventListener('touchmove', (e) => {
            if (gameRunning) {
                e.preventDefault(); // Prevenir scroll mientras se juega activamente
            }
        }, { passive: false }); // Necesita passive: false para poder usar preventDefault
    }

    // Ajustar tamaño al cambiar tamaño/orientación (con debounce)
    window.addEventListener('resize', debouncedAdjustGameContainer);
    // Usar API de orientación si existe, con fallback
    if (window.screen?.orientation) {
        try {
            window.screen.orientation.addEventListener('change', debouncedAdjustGameContainer);
        } catch (e) {
            console.warn("Screen Orientation API no soportada o con errores. Usando fallback 'orientationchange'.");
            window.addEventListener('orientationchange', debouncedAdjustGameContainer);
        }
    } else {
        window.addEventListener('orientationchange', debouncedAdjustGameContainer);
    }

    // Manejador de errores global (opcional pero recomendado)
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Error global detectado:", { message, source, lineno, colno, error });
        // Considerar enviar a un servicio de logging en producción
        // alert("Ocurrió un error inesperado. Por favor, recarga la página.");
        // return true; // Descomentar con MUCHA precaución, puede ocultar errores útiles
    };
    window.onunhandledrejection = function(event) {
         console.error("Promesa rechazada sin manejar:", event.reason);
    };

    console.log("Inicialización completa. Esperando interacción.");
}

// --- Iniciar el juego cuando el DOM esté listo ---
// Se asegura que el HTML esté parseado antes de buscar elementos y añadir listeners
document.addEventListener('DOMContentLoaded', initializeGame);
