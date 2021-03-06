// Copyright (c) 2021 by Gabriel Dubé (https://codepen.io/gdube/pen/JybxxZ)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

// 開始時に自動でカウントダウンするか
const CONFIG_START_COUNTDOWN = false;

// ジャイロ操作するか
const CONFIG_USE_MOTION = false;

// 終了後ロビーに戻す
const CONFIG_RETURN_ROBBY = true;

// スクロール禁止（関係ないかも？）
window.addEventListener(
  "touchmove",
  function (e) {
    e.preventDefault();
  },
  { passive: false }
);
window.removeEventListener(
  "touchmove",
  function (e) {
    e.preventDefault();
  },
  { passive: false }
);

var AudioX = {
  new: function (src) {
    return {
      src: src,
      audio: new Audio(src),
      play: function () {
        this.audio.play();
        this.audio = new Audio(this.src);
      },
    };
  },
};

// Audio (Game sounds)
const beep0 = AudioX.new.call(this, "./mp3/ping.mp3");
const beep1 = AudioX.new.call(this, "./mp3/hit.mp3");
const beep2 = AudioX.new.call(this, "./mp3/pong.mp3");
const beep3 = AudioX.new.call(this, "./mp3/levelup.mp3");
const beep4 = AudioX.new.call(this, "./mp3/cheers.mp3");
const beep5 = AudioX.new.call(this, "./mp3/swing.mp3");

// Global Variables
const DIRECTION = {
  IDLE: 0,
  UP: 1,
  DOWN: 2,
  LEFT: 3,
  RIGHT: 4,
};

// 定数
const MATCH = 5;
const TABLE_COLOR = "#008000";

var PADDLE_PARAMS = {
  width: 20,
  height: 150,
  speed: 16,
};

var BALL_PARAMS = {
  width: 30,
  height: 30,
  speed: 10,
};

// ジャイロセンサーから取得した重力加速度の値
var MOTION = {
  x: 0,
  z: 0,
  deg: 0,
};
// ゲーム開始直前の傾き（基準値）
var MOTION_Z_FROM = 0;

// Control
var TAP_UP = false;
var TAP_DOWN = false;
var MOTION_UP = false;
var MOTION_DOWN = false;

// The ball object (The cube that bounces back and forth)
var Ball = {
  new: function (incrementedSpeed) {
    return {
      width: BALL_PARAMS.width,
      height: BALL_PARAMS.height,
      x: this.canvas.width / 2 - BALL_PARAMS.width / 2,
      y: this.canvas.height / 2 - BALL_PARAMS.height / 2,
      moveX: DIRECTION.IDLE,
      moveY: DIRECTION.IDLE,
      speed: incrementedSpeed || BALL_PARAMS.speed,
      random: { dx: 1, dy: 1 },
    };
  },
};

// The paddle object (The two lines that move up and down)
var Paddle = {
  new: function (side, name) {
    return {
      width: PADDLE_PARAMS.width,
      height: PADDLE_PARAMS.height,
      x: side === "left" ? 150 : this.canvas.width - 150,
      y: this.canvas.height / 2 - PADDLE_PARAMS.height / 2,
      score: 0,
      move: DIRECTION.IDLE,
      speed: PADDLE_PARAMS.speed,
      name: name,
    };
  },
};

var Game = {
  initialize: function (player, opponent) {
    console.log(player, opponent);

    this.canvas = document.querySelector("canvas");
    this.context = this.canvas.getContext("2d");

    let ratio = window.devicePixelRatio;
    this.canvas.width = this.canvas.clientWidth * ratio;
    this.canvas.height = this.canvas.clientHeight * ratio;

    this.player = Paddle.new.call(this, "left", player || "no-name");
    this.paddle = Paddle.new.call(this, "right", opponent || "yu-love");
    this.ball = Ball.new.call(this);

    this.paddle.speed = PADDLE_PARAMS.speed * 0.8; // 敵パドル速度
    this.running = this.over = false;
    this.turn = this.paddle;
    this.timer = 0;
    this.color = TABLE_COLOR;

    if (CONFIG_USE_MOTION) {
      // ジャイロのパーミッション
      Pong.requestDeviceMotionPermission();
    }

    if (CONFIG_START_COUNTDOWN) {
      // 3秒カウントダウン版
      Pong.countDown(3);
    } else {
      // タップしたらスタート版
      Pong.menu();
    }
  },

  deviceMotionEventHandler: (e) => {
    // devicemotionのイベント処理
    var log = "";
    const a = e.accelerationIncludingGravity;
    MOTION.x = a.x;
    MOTION.z = a.z;
    MOTION.deg = (Math.atan(a.z / a.x) / Math.PI) * 180;
    document.getElementById("debug").innerHTML = MOTION.deg;
    if (MOTION.deg > MOTION_Z_FROM + 10) {
      MOTION_UP = false;
      MOTION_DOWN = true;
    } else if (MOTION.deg < MOTION_Z_FROM - 10) {
      MOTION_UP = true;
      MOTION_DOWN = false;
    } else {
      MOTION_UP = false;
      MOTION_DOWN = false;
    }
  },

  requestDeviceMotionPermission: () => {
    if (
      DeviceMotionEvent &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      DeviceMotionEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            // 許可を得られた場合、devicemotionをイベントリスナーに追加
            window.addEventListener(
              "devicemotion",
              Pong.deviceMotionEventHandler
            );
          } else {
            // 許可を得られなかった場合の処理
          }
        })
        .catch(console.error); // https通信でない場合などで許可を取得できなかった場合
    } else {
      // 上記以外のブラウザ
    }
  },

  endGameMenu: function (text) {
    // Change the canvas font size and color
    Pong.context.font = "50px Courier New";
    Pong.context.fillStyle = this.color;

    // Draw the rectangle behind the 'Press any key to begin' text.
    Pong.context.fillRect(
      Pong.canvas.width / 2 - 350,
      Pong.canvas.height / 2 - 48,
      700,
      100
    );

    // Change the canvas color;
    Pong.context.fillStyle = "#ffffff";

    // Draw the end game menu text ('Game Over' and 'Winner')
    Pong.context.fillText(
      text,
      Pong.canvas.width / 2,
      Pong.canvas.height / 2 + 15
    );

    setTimeout(function () {
      if (CONFIG_RETURN_ROBBY) {
        window.location = "https://yu-love-house.web.app/";
      } else {
        Pong = Object.assign({}, Game);
        Pong.initialize();
      }
    }, 3000);
  },

  // キーを押すかタップすると開始するバージョン
  menu: function () {
    // Draw all the Pong objects in their current state
    Pong.draw();

    // Change the canvas font size and color
    this.context.font = "50px Courier New";
    this.context.fillStyle = this.color;

    // Draw the rectangle behind the 'Press any key to begin' text.
    this.context.fillRect(
      this.canvas.width / 2 - 350,
      this.canvas.height / 2 - 150,
      700,
      250
    );

    // Change the canvas color;
    this.context.fillStyle = "#ffffff";

    // Draw the 'press any key to begin' text
    this.context.fillText(
      "湯★Loveピンポン",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );
    this.context.fillText(
      "TAP TO START",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );

    Pong.listen();
  },

  // カウントダウンで勝手に始まるバージョン
  countDown: function (count) {
    // Draw all the Pong objects in their current state
    Pong.draw();

    // Change the canvas font size and color
    this.context.font = "50px Courier New";
    this.context.fillStyle = this.color;

    // Draw the rectangle behind the 'Press any key to begin' text.
    this.context.fillRect(
      this.canvas.width / 2 - 48,
      this.canvas.height / 2 - 48,
      100,
      100
    );

    // Change the canvas color;
    this.context.fillStyle = "#ffffff";

    // カウントダウンを描画
    this.context.fillText(
      count,
      this.canvas.width / 2,
      this.canvas.height / 2 + 15
    );

    // 1秒待つ
    window.setTimeout(function () {
      if (count == 1) {
        Pong.listen();
        Pong.gameStart();
      } else {
        Pong.countDown(count - 1);
      }
    }, 1000);
  },

  // ランダムな速度変化
  randomSpeed: function () {
    var ddx1 = Math.random() * 6;
    var ddx2 = Math.random() * 6;
    var ddy1 = Math.random() * 6;
    var ddy2 = Math.random() * 6;
    var dx = 0.4 + (ddx1 + ddx2) * 0.1;
    var dy = 0.4 + (ddy1 + ddy2) * 0.1;
    return {
      dx: dx,
      dy: dy,
    };
  },

  // Update all objects (move the player, paddle, ball, increment the score, etc.)
  update: function () {
    if (!this.over) {
      // If the ball collides with the bound limits - correct the x and y coords.
      if (this.ball.x <= 0) {
        Pong._resetTurn.call(this, this.paddle, this.player);
      }
      if (this.ball.x >= this.canvas.width - this.ball.width) {
        Pong._resetTurn.call(this, this.player, this.paddle);
      }
      if (this.ball.y <= 0) {
        this.ball.moveY = DIRECTION.DOWN;
        this.ball.random = Pong.randomSpeed();
        beep0.play();
      }
      if (this.ball.y >= this.canvas.height - this.ball.height) {
        this.ball.moveY = DIRECTION.UP;
        this.ball.random = Pong.randomSpeed();
        beep0.play();
      }

      // Move player if they player.move value was updated by a keyboard event
      if ((TAP_UP || MOTION_UP) && !TAP_DOWN) {
        this.player.y -= this.player.speed;
      } else if ((TAP_DOWN || MOTION_DOWN) && !TAP_UP) {
        this.player.y += this.player.speed;
      }
      // if (this.player.move === DIRECTION.UP) this.player.y -= this.player.speed;
      // else if (this.player.move === DIRECTION.DOWN)
      //   this.player.y += this.player.speed;

      // On new serve (start of each turn) move the ball to the correct side
      // and randomize the direction to add some challenge.
      if (Pong._turnDelayIsOver.call(this) && this.turn) {
        this.ball.moveX =
          this.turn === this.player ? DIRECTION.LEFT : DIRECTION.RIGHT;
        this.ball.moveY = [DIRECTION.UP, DIRECTION.DOWN][
          Math.round(Math.random())
        ];
        this.ball.y =
          Math.floor(Math.random() * this.canvas.height - 200) + 200;
        this.turn = null;
      }

      // If the player collides with the bound limits, update the x and y coords.
      if (this.player.y <= 0) {
        this.player.y = 0;
      } else if (this.player.y >= this.canvas.height - this.player.height) {
        this.player.y = this.canvas.height - this.player.height;
      }

      // Move ball in intended direction based on moveY and moveX values
      // var random = Pong.randomSpeed();
      if (this.ball.moveY === DIRECTION.UP) {
        this.ball.y -= (this.ball.speed / 1.5) * this.ball.random.dy;
      } else if (this.ball.moveY === DIRECTION.DOWN) {
        this.ball.y += (this.ball.speed / 1.5) * this.ball.random.dy;
      }
      if (this.ball.moveX === DIRECTION.LEFT) {
        this.ball.x -= this.ball.speed * this.ball.random.dx;
      } else if (this.ball.moveX === DIRECTION.RIGHT) {
        this.ball.x += this.ball.speed * this.ball.random.dx;
      }

      // Handle paddle (AI) UP and DOWN movement
      if (this.paddle.y > this.ball.y - this.paddle.height / 2) {
        if (this.ball.moveX === DIRECTION.RIGHT) {
          this.paddle.y -= this.paddle.speed / 1.6;
        } else {
          this.paddle.y -= this.paddle.speed / 4;
        }
      }
      if (this.paddle.y < this.ball.y - this.paddle.height / 2) {
        if (this.ball.moveX === DIRECTION.RIGHT) {
          this.paddle.y += this.paddle.speed / 1.6;
        } else {
          this.paddle.y += this.paddle.speed / 4;
        }
      }

      // Handle paddle (AI) wall collision
      if (this.paddle.y >= this.canvas.height - this.paddle.height) {
        this.paddle.y = this.canvas.height - this.paddle.height;
      } else if (this.paddle.y <= 0) {
        this.paddle.y = 0;
      }

      // Handle Player-Ball collisions
      if (
        this.ball.x - this.ball.width <= this.player.x &&
        this.ball.x >= this.player.x - this.player.width
      ) {
        if (
          this.ball.y <= this.player.y + this.player.height &&
          this.ball.y + this.ball.height >= this.player.y
        ) {
          this.ball.x = this.player.x + this.ball.width;
          this.ball.moveX = DIRECTION.RIGHT;
          this.ball.random = Pong.randomSpeed();
          beep1.play();
        }
      }

      // Handle paddle-ball collision
      if (
        this.ball.x - this.ball.width <= this.paddle.x &&
        this.ball.x >= this.paddle.x - this.paddle.width
      ) {
        if (
          this.ball.y <= this.paddle.y + this.paddle.height &&
          this.ball.y + this.ball.height >= this.paddle.y
        ) {
          this.ball.x = this.paddle.x - this.ball.width;
          this.ball.moveX = DIRECTION.LEFT;
          this.ball.random = Pong.randomSpeed();
          beep1.play();
        }
      }
    }

    // Handle the end of round transition
    // Check to see if the player won the round.
    if (this.player.score === MATCH) {
      // Check to see if there are any more rounds/levels left and display the victory screen if there are not.
      this.over = true;
      beep4.play();
      setTimeout(function () {
        Pong.endGameMenu("Winner!");
      }, 1000);
    }
    // Check to see if the paddle/AI has won the round.
    else if (this.paddle.score === MATCH) {
      this.over = true;
      setTimeout(function () {
        Pong.endGameMenu("Game Over!");
      }, 1000);
    }
  },

  // Draw the objects to the canvas element
  draw: function () {
    // Clear the Canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the background
    this.context.fillStyle = this.color;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 卓球台のセンターライン
    this.context.beginPath();
    this.context.moveTo(0, this.canvas.height / 2);
    this.context.lineTo(this.canvas.width, this.canvas.height / 2);
    this.context.lineWidth = 20;
    this.context.strokeStyle = "#ffffff";
    this.context.stroke();

    // 影
    this.context.fillStyle = "#00000044";
    this.context.fillRect(
      this.player.x + this.canvas.width / 15,
      this.player.y + 20,
      this.player.width,
      this.player.height * 1.4
    );
    this.context.fillRect(
      this.paddle.x + this.canvas.width / 15,
      this.paddle.y + 20,
      this.paddle.width,
      this.paddle.height * 1.4
    );
    if (Pong._turnDelayIsOver.call(this)) {
      this.context.fillRect(
        this.ball.x - 2 + this.canvas.width / 15,
        this.ball.y + 2 + 20,
        this.ball.width + 4,
        this.ball.height - 4
      );
      this.context.fillRect(
        this.ball.x + 2 + this.canvas.width / 15,
        this.ball.y - 2 + 20,
        this.ball.width - 4,
        this.ball.height + 4
      );
    }

    // Draw the Player
    this.context.fillStyle = "#FFD187";
    this.context.fillRect(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height * 1.4
    );
    this.context.fillStyle = "#FF0000";
    this.context.fillRect(
      this.player.x + 4,
      this.player.y,
      this.player.width - 4,
      this.player.height
    );

    // Draw the Paddle
    this.context.fillStyle = "#FFD187";
    this.context.fillRect(
      this.paddle.x,
      this.paddle.y,
      this.paddle.width,
      this.paddle.height * 1.4
    );
    this.context.fillStyle = "#000000";
    this.context.fillRect(
      this.paddle.x,
      this.paddle.y,
      this.paddle.width - 4,
      this.paddle.height
    );

    // ネットの影
    this.context.fillStyle = "#00000044";
    this.context.fillRect(
      this.canvas.width / 2,
      0,
      this.canvas.width / 15,
      this.canvas.height
    );
    // ネット
    this.context.beginPath();
    this.context.moveTo(this.canvas.width / 2, this.canvas.height);
    this.context.lineTo(this.canvas.width / 2, 0);
    this.context.lineWidth = 10;
    this.context.strokeStyle = "#ffffff";
    this.context.stroke();

    // Draw the Ball
    this.context.fillStyle = "#ffffff";
    if (Pong._turnDelayIsOver.call(this)) {
      this.context.fillRect(
        this.ball.x - 2,
        this.ball.y + 2,
        this.ball.width + 4,
        this.ball.height - 4
      );
      this.context.fillRect(
        this.ball.x + 2,
        this.ball.y - 2,
        this.ball.width - 4,
        this.ball.height + 4
      );
    }

    // Set the default canvas font and align it to the center
    this.context.font = "50px Courier New";
    this.context.textAlign = "center";

    // Draw the players score (left)
    this.context.fillText(this.player.name, this.canvas.width / 2 - 300, 100);
    this.context.fillText(
      this.player.score.toString(),
      this.canvas.width / 2 - 300,
      150
    );

    // Draw the paddles score (right)
    this.context.fillText(this.paddle.name, this.canvas.width / 2 + 300, 100);
    this.context.fillText(
      this.paddle.score.toString(),
      this.canvas.width / 2 + 300,
      150
    );
  },

  loop: function () {
    Pong.update();
    Pong.draw();

    // If the game is not over, draw the next frame.
    if (!Pong.over) requestAnimationFrame(Pong.loop);
  },

  gameStart: function () {
    beep0.play();
    Pong.running = true;
    MOTION_Z_FROM = MOTION.deg;
    window.requestAnimationFrame(Pong.loop);
  },

  listen: function () {
    document.addEventListener("keydown", function (key) {
      // Handle the 'Press any key to begin' function and start the game.
      if (Pong.running === false) {
        Pong.gameStart();
      }

      // Handle up arrow and w key events
      if (key.keyCode === 38 || key.keyCode === 87) {
        Pong.player.move = DIRECTION.UP;
        TAP_UP = true;
      } else {
        TAP_UP = false;
      }

      // Handle down arrow and s key events
      if (key.keyCode === 40 || key.keyCode === 83) {
        Pong.player.move = DIRECTION.DOWN;
        TAP_DOWN = true;
      } else {
        TAP_DOWN = false;
      }
    });

    // Stop the player from moving when there are no keys being pressed.
    document.addEventListener("keyup", function (key) {
      Pong.player.move = DIRECTION.IDLE;
      TAP_UP = false;
      TAP_DOWN = false;
    });

    // タッチ終了
    document.getElementById("table").addEventListener("touchend", function () {
      if (Pong.running === false) {
        Pong.gameStart();
      }
    });

    // タッチ開始
    document.getElementById("up").addEventListener("touchstart", function () {
      Pong.player.move = DIRECTION.UP;
      TAP_UP = true;
    });
    document.getElementById("up").addEventListener("touchend", function () {
      Pong.player.move = DIRECTION.IDLE;
      TAP_UP = false;
    });

    document.getElementById("down").addEventListener("touchstart", function () {
      Pong.player.move = DIRECTION.DOWN;
      TAP_DOWN = true;
    });
    document.getElementById("down").addEventListener("touchend", function () {
      Pong.player.move = DIRECTION.IDLE;
      TAP_DOWN = false;
    });
  },

  // Reset the ball location, the player turns and set a delay before the next round begins.
  _resetTurn: function (victor, loser) {
    this.ball = Ball.new.call(this, this.ball.speed);
    this.turn = loser;
    this.timer = new Date().getTime();

    victor.score++;

    // if (!beep2.paused) {
    //   beep2.pause();
    //   beep2.currentTime = 0;
    // }
    beep2.play();
  },

  // Wait for a delay to have passed after each turn.
  _turnDelayIsOver: function () {
    return new Date().getTime() - this.timer >= 1000;
  },

  // Select a random color as the background of each level/round.
  _generateRoundColor: function () {
    var newColor = colors[Math.floor(Math.random() * colors.length)];
    if (newColor === this.color) return Pong._generateRoundColor();
    return newColor;
  },
};

const queryString = window.location.search || "";
var queryParams = [...new URLSearchParams(queryString).entries()].reduce(
  (obj, e) => ({ ...obj, [e[0]]: e[1] }),
  {}
);
console.log(queryParams);

if (CONFIG_USE_MOTION) {
  document.getElementById("gyro").addEventListener("click", function () {
    document.getElementById("gyro").style.display = "none";
    Pong.requestDeviceMotionPermission();
  });
} else {
  document.getElementById("gyro").style.display = "none";
}

var Pong = Object.assign({}, Game);
Pong.initialize(queryParams.player, queryParams.opponent);

window.addEventListener("resize", function () {
  location.reload();
});
window.addEventListener("orientationchange", function () {
  location.reload();
});
