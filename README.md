# Memoji Multiplayer

Segunda versão do jogo da memória da primeira unidade. A interface foi migrada
para React e a partida passou a funcionar em tempo real entre dois computadores.

## O que mudou

- Interface construída com componentes React e Hooks.
- Nenhuma manipulação manual do DOM para controlar o jogo.
- Salas multiplayer identificadas por um código de 5 caracteres.
- Comunicação constante entre os navegadores e o backend com Socket.IO.
- Backend responsável por embaralhar, validar jogadas, guardar cartas, controlar
  turnos, calcular pontos e definir o resultado.
- Reconexão automática quando um jogador atualiza a página ou perde a conexão.
- Interface responsiva com indicação de turno, conexão e últimas jogadas.

## Arquitetura

```text
Computador 1 (React) ─┐
                      ├── Socket.IO ── Backend Node.js ── Estado da partida
Computador 2 (React) ─┘
```

O frontend envia apenas a intenção de virar uma carta. O servidor confere se é a
vez daquele jogador, revela a carta, compara o par, atualiza a pontuação e envia
o novo estado aos dois computadores. O valor de uma carta fechada não é enviado
ao navegador.

## Como executar

Requisitos: Node.js 20 ou mais recente e os dois computadores na mesma rede.

```bash
npm install
npm run dev
```

No computador que iniciou o projeto, abra:

```text
http://localhost:5174
```

Para acessar pelo segundo computador:

1. Descubra o IP local do computador servidor. No macOS, use
   `ipconfig getifaddr en0`.
2. No segundo computador, abra `http://IP_DO_SERVIDOR:5174`.
3. O primeiro jogador cria uma sala e envia o código exibido.
4. O segundo jogador informa o nome, entra com o código e a partida começa.

Se o macOS pedir autorização para conexões de entrada, permita o acesso ao
Node.js. As portas usadas no desenvolvimento são `5174` (React) e `3002`
(backend).

## Comandos

```bash
npm run dev           # frontend e backend juntos
npm run dev:frontend  # somente React
npm run dev:backend   # somente servidor
npm test              # testes das regras
npm run build         # build de produção
```

## Requisitos da entrega

- [x] Jogo da primeira unidade preservado: tabuleiro 4x4, pares, pontos e turnos.
- [x] Implementação da interface em React.
- [x] Estado visual controlado por Hooks, sem manipulação manual do DOM.
- [x] Multiplayer em computadores diferentes.
- [x] Controle central da partida transferido para o backend.
- [x] Inteligência, regras, pontuação e passagem de vez no backend.
- [x] Interação constante entre backend e os dois frontends.
