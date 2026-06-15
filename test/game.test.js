import assert from "node:assert/strict";
import test from "node:test";
import { MemoryGame } from "../server/game.js";

function createStartedGame() {
  const game = new MemoryGame("TESTE", () => 0.5);
  const firstPlayer = game.addPlayer("Ana", "socket-1", "token-1");
  const secondPlayer = game.addPlayer("Beto", "socket-2", "token-2");

  return { game, firstPlayer, secondPlayer };
}

function findPair(cards) {
  for (let first = 0; first < cards.length; first += 1) {
    const second = cards.findIndex(
      (card, index) => index !== first && card.value === cards[first].value,
    );

    if (second !== -1) {
      return [first, second];
    }
  }

  throw new Error("Par não encontrado.");
}

function findMismatch(cards) {
  const first = 0;
  const second = cards.findIndex((card) => card.value !== cards[first].value);
  return [first, second];
}

test("inicia a partida somente quando o segundo jogador entra", () => {
  const game = new MemoryGame("ABCDE");
  game.addPlayer("Ana", "socket-1");

  assert.equal(game.status, "waiting");
  assert.equal(game.cards.length, 0);

  game.addPlayer("Beto", "socket-2");

  assert.equal(game.status, "playing");
  assert.equal(game.cards.length, 16);
  assert.equal(game.publicState(game.players[0].id).turnPlayerId, game.players[0].id);
});

test("mantém o turno e soma ponto quando o jogador encontra um par", () => {
  const { game, firstPlayer } = createStartedGame();
  const [first, second] = findPair(game.cards);

  game.selectCard(firstPlayer.id, first);
  const shouldResolve = game.selectCard(firstPlayer.id, second);
  game.resolvePair();

  assert.equal(shouldResolve, true);
  assert.equal(firstPlayer.score, 1);
  assert.equal(game.turn, 0);
  assert.equal(game.cards[first].matched, true);
  assert.equal(game.cards[second].matched, true);
});

test("esconde as cartas e passa a vez quando o jogador erra", () => {
  const { game, firstPlayer, secondPlayer } = createStartedGame();
  const [first, second] = findMismatch(game.cards);

  game.selectCard(firstPlayer.id, first);
  game.selectCard(firstPlayer.id, second);
  game.resolvePair();

  assert.equal(game.cards[first].faceUp, false);
  assert.equal(game.cards[second].faceUp, false);
  assert.equal(game.players[game.turn].id, secondPlayer.id);
});

test("rejeita jogada feita por quem não possui o turno", () => {
  const { game, secondPlayer } = createStartedGame();

  assert.throws(
    () => game.selectCard(secondPlayer.id, 0),
    /Aguarde a sua vez/,
  );
});

test("não envia o valor de cartas fechadas para o frontend", () => {
  const { game, firstPlayer } = createStartedGame();
  const publicState = game.publicState(firstPlayer.id);

  assert.equal(publicState.cards.every((card) => card.value === null), true);

  game.selectCard(firstPlayer.id, 0);
  const updatedState = game.publicState(firstPlayer.id);

  assert.equal(updatedState.cards[0].value, game.cards[0].value);
  assert.equal(updatedState.cards[1].value, null);
});

test("permite que o jogador recupere sua vaga após reconectar", () => {
  const { game, firstPlayer } = createStartedGame();
  game.disconnect("socket-1");

  const reconnected = game.reconnectPlayer("token-1", "socket-new");

  assert.equal(reconnected.id, firstPlayer.id);
  assert.equal(reconnected.socketId, "socket-new");
  assert.equal(reconnected.connected, true);
});
