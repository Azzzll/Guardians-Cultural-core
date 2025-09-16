const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Game = require('./Game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Настройте properly для production
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Хранилище активных игр
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create-game', (playerName) => {
    const roomId = generateRoomId();
    const game = new Game(roomId);
    game.addPlayer(socket.id, playerName);

    activeGames.set(roomId, game);
    socket.join(roomId);

    socket.emit('game-created', { roomId, playerId: socket.id });
    console.log(`Game created: ${roomId} by ${playerName}`);
  });

  socket.on('join-game', (data) => {
    const { roomId, playerName } = data;
    const game = activeGames.get(roomId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (game.players.length >= 2) {
      socket.emit('error', { message: 'Game is full' });
      return;
    }

    game.addPlayer(socket.id, playerName);
    socket.join(roomId);

    // Уведомляем обоих игроков
    io.to(roomId).emit('player-joined', {
      message: `${playerName} joined the game`,
      players: game.players.map((p) => ({ id: p.socketId, name: p.name })),
    });

    console.log(`Player ${playerName} joined game ${roomId}`);
  });

  socket.on('choose-side', (data) => {
    const { roomId, side } = data;
    const game = activeGames.get(roomId);

    if (game) {
      game.chooseSide(socket.id, side);
      io.to(roomId).emit('side-chosen', {
        playerId: socket.id,
        side,
        gameState: game.gameState,
      });
    }
  });

  socket.on('play-card', (data) => {
    const { roomId, cardIndex, slotIndex } = data;
    const game = activeGames.get(roomId);

    if (game && game.getCurrentPlayer().socketId === socket.id) {
      const player = game.players.find((p) => p.socketId === socket.id);
      const playedCard = player.playCard(cardIndex, slotIndex);

      if (playedCard) {
        io.to(roomId).emit('card-played', {
          playerId: socket.id,
          card: playedCard,
          slotIndex,
          actionsLeft: player.actions,
        });

        // Проверяем условия победы
        const loserId = game.checkWinConditions();
        if (loserId) {
          io.to(roomId).emit('game-ended', {
            winnerId:
              loserId === 'draw'
                ? null
                : game.players.find((p) => p.socketId !== loserId).socketId,
          });
          activeGames.delete(roomId);
        }
      } else {
        socket.emit('error', { message: 'Invalid move' });
      }
    }
  });

  socket.on('attack', (data) => {
    const { roomId, attackerSlotIndex, targetSlotIndex } = data;
    const game = activeGames.get(roomId);

    if (game && game.getCurrentPlayer().socketId === socket.id) {
      const player = game.players.find((p) => p.socketId === socket.id);
      const opponent = game.getOpponent();

      const result = player.attack(
        attackerSlotIndex,
        opponent,
        targetSlotIndex
      );

      if (result) {
        io.to(roomId).emit('attack-result', {
          attackerId: socket.id,
          attackerSlotIndex,
          targetSlotIndex,
          result,
          opponentHealth: opponent.health,
        });

        // Проверяем условия победы
        const loserId = game.checkWinConditions();
        if (loserId) {
          io.to(roomId).emit('game-ended', {
            winnerId:
              loserId === 'draw'
                ? null
                : game.players.find((p) => p.socketId !== loserId).socketId,
          });
          activeGames.delete(roomId);
        }
      } else {
        socket.emit('error', { message: 'Invalid attack' });
      }
    }
  });

  socket.on('end-turn', (data) => {
    const { roomId } = data;
    const game = activeGames.get(roomId);

    if (game && game.getCurrentPlayer().socketId === socket.id) {
      game.nextTurn();

      io.to(roomId).emit('turn-ended', {
        nextPlayerId: game.getCurrentPlayer().socketId,
        round: game.round,
      });

      // Отправляем обновленное состояние игры каждому игроку
      game.players.forEach((player) => {
        io.to(player.socketId).emit(
          'game-state-update',
          game.getGameStateForPlayer(player.socketId)
        );
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    // Находим игру, в которой был игрок
    for (const [roomId, game] of activeGames.entries()) {
      const playerIndex = game.players.findIndex(
        (p) => p.socketId === socket.id
      );
      if (playerIndex !== -1) {
        // Уведомляем другого игрока о дисконнекте
        const otherPlayer = game.players[1 - playerIndex];
        if (otherPlayer) {
          io.to(otherPlayer.socketId).emit('player-disconnected');
        }

        activeGames.delete(roomId);
        console.log(`Game ${roomId} terminated due to disconnect`);
        break;
      }
    }
  });
});

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
