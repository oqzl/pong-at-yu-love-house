// Copyright (c) 2021 by Gabriel Dubé (https://codepen.io/gdube/pen/JybxxZ)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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

// Audio (Game sounds)
const beep0 = new Audio("./mp3/ping.mp3");
const beep1 = new Audio("./mp3/hit.mp3");
const beep2 = new Audio("./mp3/pong.mp3");
const beep3 = new Audio("./mp3/levelup.mp3");
const beep4 = new Audio("./mp3/cheers.mp3");

// Global Variables
var DIRECTION = {
  IDLE: 0,
  UP: 1,
  DOWN: 2,
  LEFT: 3,
  RIGHT: 4,
};

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

    this.player = Paddle.new.call(this, "left", player);
    this.paddle = Paddle.new.call(this, "right", opponent);
    this.ball = Ball.new.call(this);

    this.paddle.speed = PADDLE_PARAMS.speed * 0.8; // 敵パドル速度
    this.running = this.over = false;
    this.turn = this.paddle;
    this.timer = 0;
    this.color = TABLE_COLOR;

    Pong.menu();
    Pong.listen();
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
      Pong = Object.assign({}, Game);
      Pong.initialize();
    }, 3000);
  },

  menu: function () {
    // Draw all the Pong objects in their current state
    Pong.draw();

    // Change the canvas font size and color
    this.context.font = "50px Courier New";
    this.context.fillStyle = this.color;

    // Draw the rectangle behind the 'Press any key to begin' text.
    this.context.fillRect(
      this.canvas.width / 2 - 350,
      this.canvas.height / 2 - 48,
      700,
      100
    );

    // Change the canvas color;
    this.context.fillStyle = "#ffffff";

    // Draw the 'press any key to begin' text
    this.context.fillText(
      "Press any key to begin",
      this.canvas.width / 2,
      this.canvas.height / 2 + 15
    );
  },

  // Update all objects (move the player, paddle, ball, increment the score, etc.)
  update: function () {
    if (!this.over) {
      // If the ball collides with the bound limits - correct the x and y coords.
      if (this.ball.x <= 0)
        Pong._resetTurn.call(this, this.paddle, this.player);
      if (this.ball.x >= this.canvas.width - this.ball.width)
        Pong._resetTurn.call(this, this.player, this.paddle);
      if (this.ball.y <= 0) this.ball.moveY = DIRECTION.DOWN;
      if (this.ball.y >= this.canvas.height - this.ball.height)
        this.ball.moveY = DIRECTION.UP;

      // Move player if they player.move value was updated by a keyboard event
      if (this.player.move === DIRECTION.UP) this.player.y -= this.player.speed;
      else if (this.player.move === DIRECTION.DOWN)
        this.player.y += this.player.speed;

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
      if (this.player.y <= 0) this.player.y = 0;
      else if (this.player.y >= this.canvas.height - this.player.height)
        this.player.y = this.canvas.height - this.player.height;

      // Move ball in intended direction based on moveY and moveX values
      if (this.ball.moveY === DIRECTION.UP)
        this.ball.y -= this.ball.speed / 1.5;
      else if (this.ball.moveY === DIRECTION.DOWN)
        this.ball.y += this.ball.speed / 1.5;
      if (this.ball.moveX === DIRECTION.LEFT) this.ball.x -= this.ball.speed;
      else if (this.ball.moveX === DIRECTION.RIGHT)
        this.ball.x += this.ball.speed;

      // Handle paddle (AI) UP and DOWN movement
      if (this.paddle.y > this.ball.y - this.paddle.height / 2) {
        if (this.ball.moveX === DIRECTION.RIGHT)
          this.paddle.y -= this.paddle.speed / 1.5;
        else this.paddle.y -= this.paddle.speed / 4;
      }
      if (this.paddle.y < this.ball.y - this.paddle.height / 2) {
        if (this.ball.moveX === DIRECTION.RIGHT)
          this.paddle.y += this.paddle.speed / 1.5;
        else this.paddle.y += this.paddle.speed / 4;
      }

      // Handle paddle (AI) wall collision
      if (this.paddle.y >= this.canvas.height - this.paddle.height)
        this.paddle.y = this.canvas.height - this.paddle.height;
      else if (this.paddle.y <= 0) this.paddle.y = 0;

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
    this.context.fillStyle = "#ffffff";
    // ネット
    this.context.beginPath();
    this.context.moveTo(this.canvas.width / 2, this.canvas.height);
    this.context.lineTo(this.canvas.width / 2, 0);
    this.context.lineWidth = 10;
    this.context.strokeStyle = "#ffffff";
    this.context.stroke();

    // Draw the Ball
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
    window.requestAnimationFrame(Pong.loop);
  },

  listen: function () {
    document.addEventListener("keydown", function (key) {
      // Handle the 'Press any key to begin' function and start the game.
      if (Pong.running === false) {
        // beep0.play();
        // Pong.running = true;
        // window.requestAnimationFrame(Pong.loop);
        Pong.gameStart();
      }

      // Handle up arrow and w key events
      if (key.keyCode === 38 || key.keyCode === 87)
        Pong.player.move = DIRECTION.UP;

      // Handle down arrow and s key events
      if (key.keyCode === 40 || key.keyCode === 83)
        Pong.player.move = DIRECTION.DOWN;
    });

    // Stop the player from moving when there are no keys being pressed.
    document.addEventListener("keyup", function (key) {
      Pong.player.move = DIRECTION.IDLE;
    });

    // タッチ終了
    document.getElementById("table").addEventListener("touchend", function () {
      if (Pong.running === false) {
        // beep0.play();
        // Pong.running = true;
        // window.requestAnimationFrame(Pong.loop);
        Pong.gameStart();
      }
    });

    // タッチ開始
    document.getElementById("up").addEventListener("touchstart", function () {
      Pong.player.move = DIRECTION.UP;
    });
    document.getElementById("up").addEventListener("touchend", function () {
      Pong.player.move = DIRECTION.IDLE;
    });

    document.getElementById("down").addEventListener("touchstart", function () {
      Pong.player.move = DIRECTION.DOWN;
    });
    document.getElementById("down").addEventListener("touchend", function () {
      Pong.player.move = DIRECTION.IDLE;
    });
  },

  // Reset the ball location, the player turns and set a delay before the next round begins.
  _resetTurn: function (victor, loser) {
    this.ball = Ball.new.call(this, this.ball.speed);
    this.turn = loser;
    this.timer = new Date().getTime();

    victor.score++;

    if (!beep2.paused) {
      beep2.pause();
      beep2.currentTime = 0;
    }
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

var Pong = Object.assign({}, Game);
Pong.initialize(
  queryParams.player || "no-name",
  queryParams.opponent || "yu-love"
);

window.addEventListener("resize", function () {
  location.reload();
});
window.addEventListener("orientationchange", function () {
  location.reload();
});
