import Phaser from '../lib/phaser.js';
import { SCENE_KEYS } from '../common/scene-keys.js';
import { ASSET_KEYS } from '../common/assets.js';

/**
 * @typedef {Phaser.GameObjects.Image & { speed: number }} FallingObject
 */

export class GameScene extends Phaser.Scene {
  constructor() {
    super({
      key: SCENE_KEYS.GAME_SCENE,
    });

    /** @type {Phaser.GameObjects.Image | null} */
    this.jar = null;
    /** @type {Phaser.Types.Input.Keyboard.CursorKeys | null} */
    this.cursors = null;
    /** @type {number} */
    this.jarSpeed = 0;
    /** @type {boolean} */
    this.isGameOver = false;
    /** @type {FallingObject[]} */
    this.fallingObjects = [];
    /** @type {string[]} */
    this.fallingObjectFrames = [];
    /** @type {number} */
    this.score = 0;
    /** @type {number} */
    this.misses = 0;
    /** @type {Phaser.GameObjects.Text | null} */
    this.scoreText = null;
    /** @type {Phaser.GameObjects.Text | null} */
    this.highScoreText = null;
    /** @type {Phaser.GameObjects.Text | null} */
    this.missesText = null;
    /** @type {Phaser.Time.TimerEvent | null} */
    this.spawnTimer = null;
  }

  /**
   * @public
   * Tied to the Phaser Scene lifecycle. Will run one time after the PRELOAD
   * logic is finished. Runs each time the Phaser Scene restarts.
   * @returns {void}
   */
  create() {
    // get scene width and height
    const { width, height } = this.scale;

    // add game background
    this.add.image(width / 2, height / 2, ASSET_KEYS.BACKGROUND);
    // add player
    this.jar = this.add.image(width / 2, height - 100, ASSET_KEYS.JAR);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.jarSpeed = 607.5;
    this.isGameOver = false;

    this.fallingObjects = [];
    this.fallingObjectFrames = this.textures.get(ASSET_KEYS.OBJECTS).getFrameNames();
    this.score = 0;
    this.misses = 0;

    if (this.registry.get('highScore') === undefined) {
      this.registry.set('highScore', 0);
    }

    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '24px',
      color: '#000000',
    });

    this.highScoreText = this.add.text(width - 16, 16, `High Score: ${this.registry.get('highScore')}`, {
      fontSize: '24px',
      color: '#000000',
    }).setOrigin(1, 0);

    this.missesText = this.add.text(16, 48, 'Misses: 0/3', {
      fontSize: '24px',
      color: '#000000',
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      callback: this.spawnFallingObject,
      callbackScope: this,
      loop: true,
    });
  }

  spawnFallingObject() {
    const { width } = this.scale;
    const frame = Phaser.Utils.Array.GetRandom(this.fallingObjectFrames);
    /** @type {FallingObject} */
    const fallingObject = this.add
      .image(Phaser.Math.Between(50, width - 50), -50, ASSET_KEYS.OBJECTS, frame)
      .setScale(0.5);

    fallingObject.speed = Phaser.Math.Between(150, 250);
    this.fallingObjects.push(fallingObject);
  }

  update(time, delta) {
    const { width, height } = this.scale;
    const fallingSpeedMultiplier = 1 + this.score * 0.005;

    if (this.isGameOver || !this.jar || !this.cursors || !this.scoreText || !this.highScoreText || !this.missesText) {
      return;
    }

    if (this.cursors.left.isDown) {
      this.jar.x -= this.jarSpeed * (delta / 1000);
    } else if (this.cursors.right.isDown) {
      this.jar.x += this.jarSpeed * (delta / 1000);
    }

    const halfJarWidth = this.jar.displayWidth / 2;
    this.jar.x = Phaser.Math.Clamp(this.jar.x, halfJarWidth, width - halfJarWidth);

    for (let i = this.fallingObjects.length - 1; i >= 0; i -= 1) {
      const fallingObject = this.fallingObjects[i];

      fallingObject.y += fallingObject.speed * fallingSpeedMultiplier * (delta / 1000);

      if (Phaser.Geom.Intersects.RectangleToRectangle(this.jar.getBounds(), fallingObject.getBounds())) {
        fallingObject.destroy();
        this.fallingObjects.splice(i, 1);
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);

        if (this.score > this.registry.get('highScore')) {
          this.registry.set('highScore', this.score);
          this.highScoreText.setText(`High Score: ${this.score}`);
        }

        continue;
      }

      if (fallingObject.y > height + fallingObject.displayHeight / 2) {
        fallingObject.destroy();
        this.fallingObjects.splice(i, 1);
        this.misses += 1;
        this.missesText.setText(`Misses: ${this.misses}/3`);

        if (this.misses >= 3) {
          this.gameOver();
        }
      }
    }
  }

  gameOver() {
    const { width, height } = this.scale;

    this.isGameOver = true;
    this.spawnTimer?.remove();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    this.add.text(width / 2, height / 2 - 60, 'Game Over', {
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Final Score: ${this.score}`, {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 40, `High Score: ${this.registry.get('highScore')}`, {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 110, 'Play Again', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#2e7d32',
      padding: {
        left: 16,
        right: 16,
        top: 8,
        bottom: 8,
      },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.restart();
      });
  }
}
