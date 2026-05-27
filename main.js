import './style.css'
import { Fighter } from './classes.js'
import { rectangularCollision, decreaseTimer, timerId, setTimer } from './utils.js'

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

c.fillRect(0, 0, canvas.width, canvas.height)

const player = new Fighter({
  position: { x: 50, y: 0 },
  velocity: { x: 0, y: 0 },
  offset: { x: 0, y: 0 },
  color: '#38BDF8', // Blue
  isPlayer: true
})

const enemy = new Fighter({
  position: { x: 824, y: 100 },
  velocity: { x: 0, y: 0 },
  offset: { x: -50, y: 0 },
  color: '#F87171' // Red
})

const keys = {
  a: { pressed: false },
  d: { pressed: false },
  ArrowRight: { pressed: false },
  ArrowLeft: { pressed: false }
}

// Initial static draw before game starts
c.fillStyle = 'black'
c.fillRect(0, 0, canvas.width, canvas.height)
c.fillStyle = '#333'
c.fillRect(0, canvas.height - 96, canvas.width, 96)
player.draw(c)
enemy.draw(c)

let gameStarted = false
let gameOver = false
let animationFrameId = null

const startScreen = document.getElementById('startScreen')
const btnStart = document.getElementById('btnStart')
const btnRestart = document.getElementById('btnRestart')
const gameOverModal = document.getElementById('gameOverModal')
const gameOverTitle = document.getElementById('gameOverTitle')
const orientationOverlay = document.getElementById('orientationOverlay')
const mobileQuery = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 768px)')

function syncDeviceUi() {
  const isMobile = mobileQuery.matches
  document.body.classList.toggle('is-mobile', isMobile)
  orientationOverlay.classList.toggle('is-visible', isMobile && window.innerHeight > window.innerWidth)
}

async function lockLandscapeIfPossible() {
  if (!mobileQuery.matches || !screen.orientation?.lock) return
  try {
    await screen.orientation.lock('landscape')
  } catch {
    // Some mobile browsers only allow orientation changes through the device setting.
  }
}

function getWinnerText() {
  if (player.health === enemy.health) return 'It is a Tie'
  return player.health > enemy.health ? 'Player Won' : 'Opponent Won'
}

function endGame() {
  if (gameOver) return
  gameOver = true
  gameStarted = false
  clearTimeout(timerId)
  gameOverTitle.innerHTML = getWinnerText()
  gameOverModal.classList.add('is-visible')
}

function resetGame() {
  clearTimeout(timerId)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  gameOver = false
  player.health = player.maxHealth;
  enemy.health = enemy.maxHealth;
  document.querySelector('#playerHealth').style.width = '100%';
  document.querySelector('#enemyHealth').style.width = '100%';
  player.position = { x: 50, y: 0 };
  player.velocity = { x: 0, y: 0 };
  enemy.position = { x: 824, y: 100 };
  enemy.velocity = { x: 0, y: 0 };
  player.isDead = false;
  enemy.isDead = false;
  player.isDodging = false;
  enemy.isDodging = false;
  player.attackType = null;
  enemy.attackType = null;
  player.hasHit = false;
  enemy.hasHit = false;
  setTimer(60);
  document.querySelector('#displayText').style.display = 'none';
  gameOverModal.classList.remove('is-visible');
  gameStarted = true;
  decreaseTimer(player, enemy, endGame);
  animate();
}

btnRestart.addEventListener('click', () => {
  startScreen.style.display = 'none';
  resetGame();
});


btnStart.addEventListener('click', async () => {
  await lockLandscapeIfPossible()
  startScreen.style.display = 'none'
  resetGame()
})

function animate() {
  if (!gameStarted) return;
  animationFrameId = window.requestAnimationFrame(animate)
  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // Draw ground
  c.fillStyle = '#333'
  c.fillRect(0, canvas.height - 96, canvas.width, 96)

  player.update(c, canvas.height, canvas.width)
  enemy.update(c, canvas.height, canvas.width)

  player.velocity.x = 0
  enemy.velocity.x = 0

  // Player movement
  if (keys.a.pressed && player.position.x >= 0) {
    player.velocity.x = -5
    player.attackBox.offset.x = -50
  } else if (keys.d.pressed && player.position.x <= canvas.width - player.width) {
    player.velocity.x = 5
    player.attackBox.offset.x = 0
  }

  // Enemy movement & AI (Randomized simple AI)
  if (!enemy.isDead && !player.isDead) {
    const dist = player.position.x - enemy.position.x
    if (Math.abs(dist) > 80) {
      // move towards player
      if (dist > 0 && enemy.position.x <= canvas.width - enemy.width) {
        enemy.velocity.x = 3
        enemy.attackBox.offset.x = 0
      } else if (enemy.position.x >= 0) {
        enemy.velocity.x = -3
        enemy.attackBox.offset.x = -50
      }
    } else {
      // close enough to attack
      if (Math.random() < 0.08) { 
        const rand = Math.random();
        if (rand < 0.2) enemy.attack('roundhouse')
        else if (rand < 0.5) enemy.attack('kick')
        else enemy.attack('punch')
      }
      // occasionally dodge
      if (Math.random() < 0.02) {
        enemy.dodge()
      }
    }

    // Occasional random jump
    if (Math.random() < 0.01 && enemy.position.y >= canvas.height - 96 - enemy.height) {
      enemy.velocity.y = -15
    }
  }

  const getDamage = (type) => {
    if (type === 'roundhouse') return 25;
    if (type === 'kick') return 15;
    return 10;
  }

  // Detect for collision & enemy gets hit
  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.attackType && !player.hasHit && !enemy.isDodging
  ) {
    player.hasHit = true
    enemy.health -= getDamage(player.attackType)
    document.querySelector('#enemyHealth').style.width = Math.max((enemy.health / enemy.maxHealth) * 100, 0) + '%'
  }

  // Detect for collision & player gets hit
  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.attackType && !enemy.hasHit && !player.isDodging
  ) {
    enemy.hasHit = true
    player.health -= getDamage(enemy.attackType)
    document.querySelector('#playerHealth').style.width = Math.max((player.health / player.maxHealth) * 100, 0) + '%'
  }

  // End game based on health
  if (enemy.health <= 0 || player.health <= 0) {
    if (enemy.health <= 0) enemy.isDead = true
    if (player.health <= 0) player.isDead = true
    endGame()
  }
}

// animate() is now called when Start Game is pressed

// Desktop Controls
window.addEventListener('keydown', (event) => {
  if (gameStarted && !player.isDead && !enemy.isDead) {
    switch (event.key) {
      case 'd':
      case 'ArrowRight':
        keys.d.pressed = true
        break
      case 'a':
      case 'ArrowLeft':
        keys.a.pressed = true
        break
      case 'w':
      case 'ArrowUp':
        if (player.position.y >= canvas.height - 96 - player.height) {
          player.velocity.y = -15
        }
        break
      case 's':
      case 'ArrowDown':
        player.dodge()
        break
      case ' ':
        player.attack('punch')
        break
      case 'e':
        player.attack('kick')
        break
      case 'r':
        player.attack('roundhouse')
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd':
    case 'ArrowRight':
      keys.d.pressed = false
      break
    case 'a':
    case 'ArrowLeft':
      keys.a.pressed = false
      break
  }
})

// Mobile Controls
const btnLeft = document.getElementById('btnLeft')
const btnRight = document.getElementById('btnRight')
const btnJump = document.getElementById('btnJump')
const btnDodge = document.getElementById('btnDodge')
const btnAttack = document.getElementById('btnAttack')
const btnKick = document.getElementById('btnKick')
const btnRoundhouse = document.getElementById('btnRoundhouse')

btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) keys.a.pressed = true })
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.a.pressed = false })
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) keys.d.pressed = true })
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.d.pressed = false })

btnJump.addEventListener('touchstart', (e) => { 
  e.preventDefault(); 
  if (gameStarted && player.position.y >= canvas.height - 96 - player.height) {
    player.velocity.y = -15
  }
})
btnDodge.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) player.dodge() })
btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) player.attack('punch') })
btnKick.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) player.attack('kick') })
btnRoundhouse.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameStarted) player.attack('roundhouse') })

syncDeviceUi()
mobileQuery.addEventListener?.('change', syncDeviceUi)
window.addEventListener('resize', syncDeviceUi)
window.addEventListener('orientationchange', syncDeviceUi)
