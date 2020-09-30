"use string";

const SOUND_VOLUME = 0.75;
const TIMEUPDATE_BUFFER = 0.7;

const SPACE_KEY_CODE = 32;

const HERO_WIDTH = 75;
const HERO_HEIGHT = 65;
const HERO_INITIAL_X = 500;
const HERO_INITIAL_Y = 300;

const ENEMY_HEIGHT = 128;
const ENEMY_WIDTH = 128;
const ENEMY_SPEED = 2;

const BLAST_SPEED = 10;
const BLAST_SIZE = 32;
const BLAST_DEBOUNCE = 500;

const ENEMY_GENERATOR_TIMINGS = {
  START: 1000,
  END: 5000,
};

const PATHS = {
  IMAGES: {
    HERO: "images/x-wing.png",
    ENEMY: "images/enemy.png",
    BLAST: "images/fireball.png",
    BACKGROUND: "images/scene.png",
  },
  SOUNDS: {
    EXPLODE: "sounds/collide.wav",
    FIRE: "sounds/fire.wav",
    ENEMY: "sounds/enemy.mp3",
    FLYBY: "sounds/flyby.mp3",
    BACKGROUND: "sounds/background.mp3",
  },
};

const VOLUMES = {
  FLYBY: 0,
  BACKGROUND: 0.25,
};

/** @type {HTMLCanvasElement | null} */
let canvas = null;
/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
/** @type {string | null} */
let windowComputedFontFamily = null;
/** @type {string | null} */
let windowComputedFontSize = null;
/** @type {string | null} */
let windowComputedFontColor = null;

/** @type {Hero | null} */
let hero = null;

/** @type {HTMLImageElement | null} */
let backgroundImage = null;
/** @type {HTMLImageElement | null} */
let blastImage = null;
/** @type {HTMLImageElement | null} */
let enemyImage = null;

/** @type {Array<Blast>} */
const blasts = [];
/** @type {Array<Enemy>} */
const enemies = [];

let backgroundShiftX = 100;
let spritePosition = 0;

/** @type {HTMLAudioElement | null} */
let flybySound = null;
/** @type {HTMLAudioElement | null} */
let enemySound = null;
/** @type {HTMLAudioElement | null} */
let fireSound = null;
/** @type {HTMLAudioElement | null} */
let explodeSound = null;
/** @type {HTMLAudioElement | null} */
let backgroundSound = null;

// let mouseDowned = false;
let lastMouseX = 500;
let lastMouseY = 300;

let score = 0;

let sceneTimer = null;
let enemyGeneratorTimer = null;

// Set the name of the hidden property and the change event for visibility
let hidden, visibilityChange;
if (typeof document.hidden !== "undefined") {
  // Opera 12.10 and Firefox 18 and later support
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}

window.addEventListener("DOMContentLoaded", async () => {
  windowComputedFontFamily = css(document.body, "font-family");
  windowComputedFontSize = css(document.body, "font-size");
  windowComputedFontColor = css(document.body, "color");

  canvas = document.getElementById("scene");
  ctx = canvas.getContext("2d");

  [
    hero,
    backgroundImage,
    blastImage,
    enemyImage,
    enemySound,
    fireSound,
    explodeSound,
    flybySound,
    backgroundSound,
  ] = await Promise.all([
    loadDragonModel(),
    loadBackgroundImage(),
    loadFireballImage(),
    loadEnemyImage(),
    loadEnemySound(),
    loadFireSound(),
    loadExplodeSound(),
    loadFlybySound(),
    loadBackgroundSound(),
  ]);

  const scene = document.getElementById("scene");
  scene.addEventListener("mousemove", handleMouseMove);

  const autoplaySounds = [flybySound, backgroundSound];
  window.addEventListener("keydown", withAutoplayHook(handleKeyDown, autoplaySounds));
  window.addEventListener("click", withAutoplayHook(_.noop, autoplaySounds));

  window.addEventListener("focus", handleWindowFocus, false);
  window.addEventListener("blur", handleWindowBlur, false);
  document.addEventListener(visibilityChange, handleVisibilityChange, false);

  sceneTimer = requestAnimationFrame(drawScene);
  enemyGeneratorTimer = startEnemyGenerator();
});

/* ---------------------- GENERATORS --------------------- */

function startEnemyGenerator() {
  return setInterval(() => {
    const y = getRandomBetween(0, canvas.height - ENEMY_HEIGHT);
    const enemy = new Enemy(canvas.width, y, ENEMY_WIDTH, ENEMY_HEIGHT, -ENEMY_SPEED, enemyImage);
    enemies.push(enemy);
  }, getRandomBetween(ENEMY_GENERATOR_TIMINGS.START, ENEMY_GENERATOR_TIMINGS.END));
}

/* ------------------------------------------------------- */

/* -------------------- IMAGE LOADERS -------------------- */

function loadImage(path) {
  const loader = new ImageLoader(path);
  return loader.load();
}

async function loadDragonModel() {
  const image = await loadImage(PATHS.IMAGES.HERO);
  return new Hero(HERO_INITIAL_X, HERO_INITIAL_Y, HERO_WIDTH, HERO_HEIGHT, image);
}

function loadEnemyImage() {
  return loadImage(PATHS.IMAGES.ENEMY);
}

function loadFireballImage() {
  return loadImage(PATHS.IMAGES.BLAST);
}

function loadBackgroundImage() {
  return loadImage(PATHS.IMAGES.BACKGROUND);
}

/* ------------------------------------------------------- */

/* -------------------- SOUND LOADERS -------------------- */

function loadSound(path, volume = SOUND_VOLUME) {
  const loader = new SoundLoader(path, volume);
  return loader.load();
}

async function loadFlybySound() {
  const sound = await loadSound(PATHS.SOUNDS.FLYBY, VOLUMES.FLYBY);

  sound.loop = true;
  sound.muted = true;

  sound.addEventListener("timeupdate", handleSoundTimeUpdate);

  return sound;
}

function loadFireSound() {
  return loadSound(PATHS.SOUNDS.FIRE);
}

function loadExplodeSound() {
  return loadSound(PATHS.SOUNDS.EXPLODE);
}

function loadEnemySound() {
  return loadSound(PATHS.SOUNDS.ENEMY);
}

async function loadBackgroundSound() {
  const sound = await loadSound(PATHS.SOUNDS.BACKGROUND, VOLUMES.BACKGROUND);

  sound.loop = true;
  sound.muted = true;

  sound.addEventListener("timeupdate", handleSoundTimeUpdate);

  return sound;
}

function handleSoundTimeUpdate() {
  if (this.currentTime > this.duration - TIMEUPDATE_BUFFER) {
    this.currentTime = 0;
    this.play();
  }
}

/* ------------------------------------------------------- */

/* ------------------------ UTILS ------------------------ */

/**
 * Get random number between X and Y
 *
 * @param {number} x Start of range
 * @param {number} y End of range
 * @returns {number} Random number between X and Y
 */
function getRandomBetween(x, y) {
  return Math.floor(Math.random() * y) + x;
}

/**
 * @param {HTMLAudioElement} sound
 */
function playSound(sound) {
  sound.currentTime = 0;
  sound.play();
}

/**
 * @param {Element} element
 * @param {string} property
 * @returns {string} CSS property value
 */
function css(element, property) {
  return window.getComputedStyle(element, null).getPropertyValue(property);
}

/**
 * @param {(event: Event) => void} fn
 * @param {Array<HTMLAudioElement>} sounds
 * @returns {(event: Event) => void}
 */
function withAutoplayHook(fn, sounds) {
  const play = _.once(() => {
    for (const sound of sounds) {
      sound.muted = false;
      sound.play();
    }
  });

  return function (...args) {
    play();
    fn.call(this, ...args);
  };
}

/* -------------------------------------------------------- */

/* -------------------- EVENT HANDLERS -------------------- */

function handleMouseMove(event) {
  // binding mousemove event
  const mouseX = event.layerX || 0;
  const mouseY = event.layerY || 0;

  // saving last coordinates
  lastMouseX = mouseX;
  lastMouseY = mouseY;

  // perform dragon dragging
  if (hero.dragging) {
    hero.x = mouseX;
    hero.y = mouseY;
  }
}

const handleKeyDown = _.throttle((event) => {
  if (event.keyCode === SPACE_KEY_CODE) {
    const blast = new Blast(hero.x, hero.y - BLAST_SIZE / 2, BLAST_SIZE, BLAST_SIZE, BLAST_SPEED, blastImage);
    blasts.push(blast);

    playSound(fireSound);
  }
}, BLAST_DEBOUNCE);

/**
 * @param {boolean} hidden
 */
function handleVisibilityChange(hidden) {
  const sounds = [fireSound, explodeSound, enemySound, flybySound, backgroundSound];

  for (const sound of sounds) {
    sound.muted = typeof hidden !== "undefined" ? hidden : document[hidden];
  }

  if (typeof hidden !== "undefined" ? hidden : document[hidden]) {
    clearInterval(enemyGeneratorTimer);
    cancelAnimationFrame(sceneTimer);
  } else {
    enemyGeneratorTimer = startEnemyGenerator();
    requestAnimationFrame(drawScene);
  }
}

function handleWindowFocus() {
  handleVisibilityChange(false);
}

function handleWindowBlur() {
  handleVisibilityChange(true);
}

/* -------------------------------------------------------- */

function drawScene() {
  // main drawScene function
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clear canvas
  ctx.imageSmoothingEnabled = false;

  // draw background
  backgroundShiftX += 4;
  if (backgroundShiftX >= 920) {
    backgroundShiftX = 0;
  }

  ctx.drawImage(backgroundImage, 0 + backgroundShiftX, 0, 1000, 1080, 0, 0, 1000, 600);

  // draw fireballs
  if (blasts.length > 0) {
    for (let key in blasts) {
      if (blasts[key] != null) {
        ctx.drawImage(blasts[key].image, blasts[key].x, blasts[key].y);
        blasts[key].x += blasts[key].speed;

        if (blasts[key].x > canvas.width) {
          delete blasts[key];
        }
      }
    }
  }

  // draw enemies
  if (enemies.length > 0) {
    for (let key in enemies) {
      if (enemies[key] != null) {
        ctx.drawImage(enemies[key].image, enemies[key].x, enemies[key].y);
        enemies[key].x += enemies[key].speed;

        if (enemies[key].x < -ENEMY_WIDTH) {
          delete enemies[key];
          playSound(enemySound);
        }
      }
    }
  }

  // draw hero
  ctx.drawImage(
    hero.image,
    0,
    0,
    hero.width,
    hero.height,
    hero.x - hero.width / 2,
    hero.y - hero.height / 2,
    hero.width,
    hero.height
  );

  // collision detection
  if (blasts.length > 0) {
    for (let key in blasts) {
      if (blasts[key] != null) {
        if (enemies.length > 0) {
          for (let enemy in enemies) {
            if (enemies[enemy] != null && blasts[key] != null) {
              if (
                blasts[key].x + blasts[key].width > enemies[enemy].x &&
                blasts[key].y + blasts[key].height > enemies[enemy].y &&
                blasts[key].y < enemies[enemy].y + enemies[enemy].height
              ) {
                delete enemies[enemy];
                delete blasts[key];
                score++;
                playSound(explodeSound);
              }
            }
          }
        }
      }
    }
  }

  // draw score
  ctx.font = `${parseInt(windowComputedFontSize)}px ${windowComputedFontFamily}`;
  ctx.fillStyle = windowComputedFontColor;
  ctx.fillText(I18n.t("score") + ": " + score * 10, 920, 580);
  ctx.fillText(I18n.t("fire"), 20, 580);

  sceneTimer = requestAnimationFrame(drawScene);
}
