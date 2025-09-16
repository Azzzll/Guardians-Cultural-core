const Player = require('./Player');
const Deck = require('./Deck');

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.deck = new Deck();
    this.currentPlayerIndex = 0;
    this.turnPhase = 'draw'; // draw, main, battle, end
    this.round = 1;
    this.gameState = 'waiting'; // waiting, choosing-sides, playing, finished
    this.firstPlayerChoice = null;
  }

  addPlayer(socketId, name) {
    const player = new Player(socketId, name);
    this.players.push(player);
    return player;
  }

  chooseSide(socketId, side) {
    const player = this.players.find((p) => p.socketId === socketId);
    if (player) {
      player.hero = side;

      // Если оба игрока выбрали стороны, начинаем игру
      if (this.players.every((p) => p.hero !== null)) {
        this.startGame();
      }
    }
  }

  startGame() {
    this.gameState = 'playing';
    this.deck.initializeGameDeck();

    // Раздаем начальные карты
    this.players.forEach((player) => {
      // 5 карт: 3 героя, 2 баффа
      const initialCards = player.drawCards(this.deck, 5);
      // Здесь можно добавить логику для гарантии 3 героев и 2 баффов
    });

    // Жребий для первого хода
    this.currentPlayerIndex = Math.random() > 0.5 ? 1 : 0;
    this.players[this.currentPlayerIndex].isTurn = true;

    this.turnPhase = 'main';
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getOpponent() {
    return this.players[1 - this.currentPlayerIndex];
  }

  nextTurn() {
    // Применяем эффекты начала хода (кровотечение и т.д.)
    this.applyStartOfTurnEffects();

    // Сбрасываем действия для текущего игрока
    this.getCurrentPlayer().resetTurn();

    // Передаем ход следующему игроку
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    this.players[this.currentPlayerIndex].isTurn = true;

    // Если начало нового раунда
    if (this.currentPlayerIndex === 0) {
      this.round++;

      // Раздаем карты в начале раунда (кроме первого)
      if (this.round > 1) {
        this.players.forEach((player) => {
          const choiceCards = this.deck.getCards(3);
          // Здесь должна быть логика выбора 2 из 3 карт
          // Пока просто берем первые 2
          player.hand = [...player.hand, ...choiceCards.slice(0, 2)];
          // Оставшуюся карту сбрасываем
          this.deck.discard(choiceCards[2]);
        });
      }
    }

    this.turnPhase = 'main';
  }

  applyStartOfTurnEffects() {
    const player = this.getCurrentPlayer();

    player.field.forEach((card) => {
      if (card && card.type === 'hero') {
        // Применяем эффекты кровотечения/отравления
        if (card.debuffs.includes('bleed')) {
          card.takeDamage(1);
        }

        // Уменьшаем длительность эффектов
        // (здесь нужно добавить логику отслеживания длительности)
      }
    });
  }

  checkWinConditions() {
    // Проверяем условия победы
    for (const player of this.players) {
      if (player.health <= 0) {
        return player.socketId; // Проигравший
      }
    }

    // Если у обоих игроков закончились карты
    if (
      this.deck.cards.length === 0 &&
      this.players.every((p) => p.hand.length === 0)
    ) {
      const player1 = this.players[0];
      const player2 = this.players[1];

      if (player1.health > player2.health) {
        return player2.socketId;
      } else if (player2.health > player1.health) {
        return player1.socketId;
      } else {
        return 'draw'; // Ничья
      }
    }

    return null; // Игра продолжается
  }

  getGameStateForPlayer(socketId) {
    const player = this.players.find((p) => p.socketId === socketId);
    const opponent = this.players.find((p) => p.socketId !== socketId);

    return {
      round: this.round,
      phase: this.turnPhase,
      player: {
        health: player.health,
        hand: player.hand,
        field: player.field,
        actions: player.actions,
        isTurn: player.isTurn,
      },
      opponent: {
        health: opponent.health,
        field: this.round > 1 ? opponent.field : opponent.field.map(() => null), // В первом раунде карты скрыты
        // Рука противника никогда не видна
      },
      deckSize: this.deck.cards.length,
    };
  }
}

module.exports = Game;
