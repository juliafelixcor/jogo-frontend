import { useEffect, useMemo, useState } from "react";
import { emitWithResponse, socket } from "./socket";

const SESSION_KEY = "memoji-player-session";

function readSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function Lobby({ connected, busy, error, onCreate, onJoin }) {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("create");

  function submit(event) {
    event.preventDefault();

    if (mode === "create") {
      onCreate(name);
      return;
    }

    onJoin(name, roomCode);
  }

  return (
    <main className="lobby-shell">
      <section className="lobby-card">
        <div className="brand-mark" aria-hidden="true">😁</div>
        <p className="eyebrow">Jogo da memória online</p>
        <h1>Memoji</h1>
        <p className="intro">
          Crie uma sala, envie o código para outra pessoa e joguem em
          computadores diferentes.
        </p>

        <div className="mode-tabs" role="tablist" aria-label="Acesso à partida">
          <button
            className={mode === "create" ? "active" : ""}
            type="button"
            onClick={() => setMode("create")}
          >
            Criar sala
          </button>
          <button
            className={mode === "join" ? "active" : ""}
            type="button"
            onClick={() => setMode("join")}
          >
            Entrar em sala
          </button>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="player-name">Seu nome</label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            placeholder="Ex.: Emanuel"
            autoComplete="name"
          />

          {mode === "join" && (
            <>
              <label htmlFor="room-code">Código da sala</label>
              <input
                id="room-code"
                className="code-input"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={5}
                placeholder="ABCDE"
                autoComplete="off"
              />
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button
            className="primary-button"
            type="submit"
            disabled={!connected || busy}
          >
            {busy
              ? "Conectando..."
              : mode === "create"
                ? "Criar partida"
                : "Entrar na partida"}
          </button>
        </form>

        <p className={`connection-status ${connected ? "online" : ""}`}>
          <span aria-hidden="true" />
          {connected ? "Servidor conectado" : "Conectando ao servidor..."}
        </p>
      </section>
    </main>
  );
}

function Scoreboard({ game }) {
  return (
    <section className="scoreboard" aria-label="Placar">
      {game.players.map((player) => {
        const isTurn = game.turnPlayerId === player.id && game.status === "playing";
        const isYou = game.youPlayerId === player.id;

        return (
          <article className={`player-card ${isTurn ? "current" : ""}`} key={player.id}>
            <div className="player-name">
              <span className={`presence ${player.connected ? "online" : ""}`} />
              <strong>{player.name}</strong>
              {isYou && <small>você</small>}
            </div>
            <span className="score">{player.score}</span>
            <p>{isTurn ? "jogando agora" : "aguardando"}</p>
          </article>
        );
      })}
    </section>
  );
}

function Board({ game, onFlip }) {
  const isYourTurn = game.turnPlayerId === game.youPlayerId;
  const canPlay = game.status === "playing" && isYourTurn && !game.locked;

  return (
    <div className="board" aria-label="Tabuleiro do jogo da memória">
      {game.cards.map((card) => (
        <button
          className={`memory-card ${card.faceUp ? "face-up" : ""} ${card.matched ? "matched" : ""}`}
          type="button"
          key={card.id}
          onClick={() => onFlip(card.id)}
          disabled={!canPlay || card.faceUp || card.matched}
          aria-label={
            card.faceUp || card.matched
              ? `Carta ${card.value}`
              : `Carta fechada ${card.id + 1}`
          }
        >
          <span className="card-inner">
            <span className="card-back" aria-hidden="true">?</span>
            <span className="card-front" aria-hidden="true">{card.value}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function GameScreen({ game, connected, error, onFlip, onRestart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const currentPlayer = game.players.find(
    (player) => player.id === game.turnPlayerId,
  );
  const isYourTurn = game.turnPlayerId === game.youPlayerId;

  async function copyCode() {
    await navigator.clipboard.writeText(game.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  let statusMessage = "Aguardando o segundo jogador entrar...";

  if (game.status === "playing") {
    statusMessage = isYourTurn
      ? game.locked
        ? "Comparando as cartas..."
        : "Sua vez: encontre um par!"
      : `Vez de ${currentPlayer?.name ?? "outro jogador"}`;
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">Partida multiplayer</p>
          <h1>Memoji</h1>
        </div>
        <div className="room-actions">
          <div>
            <small>Sala</small>
            <strong>{game.code}</strong>
          </div>
          <button type="button" onClick={copyCode}>
            {copied ? "Copiado!" : "Copiar código"}
          </button>
          <button className="leave-button" type="button" onClick={onLeave}>
            Sair
          </button>
        </div>
      </header>

      <div className={`network-banner ${connected ? "connected" : ""}`}>
        {connected ? "Conectado em tempo real" : "Conexão perdida. Reconectando..."}
      </div>

      <Scoreboard game={game} />

      {game.status === "waiting" ? (
        <section className="waiting-card">
          <div className="waiting-faces" aria-hidden="true">
            <span>😁</span>
            <span>?</span>
          </div>
          <h2>Esperando companhia</h2>
          <p>Envie o código <strong>{game.code}</strong> para o segundo jogador.</p>
          <button className="primary-button" type="button" onClick={copyCode}>
            {copied ? "Código copiado" : "Copiar código da sala"}
          </button>
        </section>
      ) : (
        <section className="game-area">
          <div className={`turn-message ${isYourTurn ? "your-turn" : ""}`}>
            {statusMessage}
          </div>
          <Board game={game} onFlip={onFlip} />

          {game.logs.length > 0 && (
            <ol className="event-log" aria-label="Últimas jogadas">
              {game.logs.map((item, index) => (
                <li className={`${item.type} ${index === 0 ? "latest" : ""}`} key={item.id}>
                  {item.message}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {error && <p className="game-error" role="alert">{error}</p>}

      {game.status === "finished" && (
        <div className="modal-backdrop" role="presentation">
          <section className="result-modal" role="dialog" aria-modal="true">
            <span className="result-emoji" aria-hidden="true">
              {game.winner?.type === "draw" ? "🤝" : "🏆"}
            </span>
            <p className="eyebrow">Fim de partida</p>
            <h2>
              {game.winner?.type === "draw"
                ? "Deu empate!"
                : `${game.winner?.name} venceu!`}
            </h2>
            <p>O placar final ficou {game.players[0].score} a {game.players[1].score}.</p>
            <button className="primary-button" type="button" onClick={onRestart}>
              Jogar novamente
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedSession = useMemo(readSavedSession, []);

  useEffect(() => {
    function handleConnect() {
      setConnected(true);

      const session = readSavedSession();
      if (!session) {
        return;
      }

      emitWithResponse("room:resume", session).then((response) => {
        if (!response?.ok) {
          localStorage.removeItem(SESSION_KEY);
          setGame(null);
        }
      });
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleGameState(nextGame) {
      setGame(nextGame);
      setError("");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("game:state", handleGameState);

    if (socket.connected && savedSession) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("game:state", handleGameState);
    };
  }, [savedSession]);

  async function enterRoom(event, payload) {
    setBusy(true);
    setError("");
    const response = await emitWithResponse(event, payload);
    setBusy(false);

    if (!response?.ok) {
      setError(response?.message ?? "Não foi possível acessar a sala.");
      return;
    }

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ code: response.code, token: response.token }),
    );
  }

  async function flipCard(cardIndex) {
    const response = await emitWithResponse("game:flip", { cardIndex });

    if (!response?.ok) {
      setError(response?.message ?? "Jogada não permitida.");
    }
  }

  async function restartGame() {
    const response = await emitWithResponse("game:restart");

    if (!response?.ok) {
      setError(response?.message ?? "Não foi possível reiniciar.");
    }
  }

  async function leaveGame() {
    await emitWithResponse("room:leave");
    localStorage.removeItem(SESSION_KEY);
    setGame(null);
    setError("");
  }

  if (!game) {
    return (
      <Lobby
        connected={connected}
        busy={busy}
        error={error}
        onCreate={(name) => enterRoom("room:create", { name })}
        onJoin={(name, code) => enterRoom("room:join", { name, code })}
      />
    );
  }

  return (
    <GameScreen
      game={game}
      connected={connected}
      error={error}
      onFlip={flipCard}
      onRestart={restartGame}
      onLeave={leaveGame}
    />
  );
}
