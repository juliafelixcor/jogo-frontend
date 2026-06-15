import { randomUUID } from "node:crypto";

export const CARD_VALUES = [
  "😁", "😁", "😍", "😍", "😝", "😝", "😎", "😎",
  "😭", "😭", "🤓", "🤓", "😡", "😡", "😏", "😏",
];

function shuffle(values, random = Math.random) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

export class MemoryGame {
  constructor(code, random = Math.random) {
    this.code = code;
    this.random = random;
    this.players = [];
    this.cards = [];
    this.turn = 0;
    this.selected = [];
    this.locked = false;
    this.status = "waiting";
    this.logs = [];
    this.winner = null;
  }

  addPlayer(name, socketId, token = randomUUID()) {
    if (this.players.length >= 2) {
      throw new Error("Esta sala já possui dois jogadores.");
    }

    const player = {
      id: randomUUID(),
      token,
      name,
      socketId,
      score: 0,
      connected: true,
    };

    this.players.push(player);

    if (this.players.length === 2) {
      this.start();
    }

    return player;
  }

  reconnectPlayer(token, socketId) {
    const player = this.players.find((item) => item.token === token);

    if (!player) {
      throw new Error("Não foi possível recuperar sua vaga nesta sala.");
    }

    player.socketId = socketId;
    player.connected = true;
    return player;
  }

  disconnect(socketId) {
    const player = this.players.find((item) => item.socketId === socketId);

    if (player) {
      player.connected = false;
    }
  }

  start() {
    this.cards = shuffle(CARD_VALUES, this.random).map((value, index) => ({
      id: index,
      value,
      faceUp: false,
      matched: false,
    }));
    this.players.forEach((player) => {
      player.score = 0;
    });
    this.turn = 0;
    this.selected = [];
    this.locked = false;
    this.status = "playing";
    this.logs = [];
    this.winner = null;
  }

  restart(playerId) {
    if (!this.players.some((player) => player.id === playerId)) {
      throw new Error("Jogador inválido.");
    }

    if (this.status !== "finished") {
      throw new Error("A partida ainda não terminou.");
    }

    this.start();
  }

  selectCard(playerId, cardIndex) {
    if (this.status !== "playing") {
      throw new Error("A partida ainda não está disponível.");
    }

    const currentPlayer = this.players[this.turn];

    if (currentPlayer.id !== playerId) {
      throw new Error("Aguarde a sua vez.");
    }

    if (this.locked) {
      throw new Error("Aguarde a comparação das cartas.");
    }

    const card = this.cards[cardIndex];

    if (!card || card.faceUp || card.matched) {
      throw new Error("Esta carta não pode ser escolhida.");
    }

    card.faceUp = true;
    this.selected.push(cardIndex);

    if (this.selected.length === 2) {
      this.locked = true;
      return true;
    }

    return false;
  }

  resolvePair() {
    if (this.selected.length !== 2) {
      return;
    }

    const [firstIndex, secondIndex] = this.selected;
    const first = this.cards[firstIndex];
    const second = this.cards[secondIndex];
    const player = this.players[this.turn];

    if (first.value === second.value) {
      first.matched = true;
      second.matched = true;
      player.score += 1;
      this.addLog(`${player.name} encontrou um par!`, "success");

      if (this.cards.every((card) => card.matched)) {
        this.finish();
      }
    } else {
      first.faceUp = false;
      second.faceUp = false;
      this.addLog(`${player.name} não encontrou um par.`, "error");
      this.turn = this.turn === 0 ? 1 : 0;
    }

    this.selected = [];
    this.locked = false;
  }

  finish() {
    this.status = "finished";
    const [first, second] = this.players;

    if (first.score === second.score) {
      this.winner = { type: "draw", name: null };
      return;
    }

    const winner = first.score > second.score ? first : second;
    this.winner = { type: "winner", name: winner.name };
  }

  addLog(message, type) {
    this.logs.unshift({
      id: randomUUID(),
      message,
      type,
    });
    this.logs = this.logs.slice(0, 4);
  }

  publicState(playerId) {
    return {
      code: this.code,
      status: this.status,
      players: this.players.map(({ id, name, score, connected }) => ({
        id,
        name,
        score,
        connected,
      })),
      cards: this.cards.map(({ id, value, faceUp, matched }) => ({
        id,
        value: faceUp || matched ? value : null,
        faceUp,
        matched,
      })),
      turnPlayerId: this.players[this.turn]?.id ?? null,
      locked: this.locked,
      logs: this.logs,
      winner: this.winner,
      youPlayerId: playerId,
    };
  }
}
