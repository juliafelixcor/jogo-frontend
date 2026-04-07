import { Game } from "./classes/Game.js";

const params = new URLSearchParams(window.location.search);
const game = new Game(params.get("p1"), params.get("p2"));

const tabela = document.getElementById("tabuleiro");
const placar = document.getElementById("placar");

game.gerarCartas();

function atualizarPlacar() {
    placar.innerHTML = `
        <span class="${game.turno === 0 ? 'turno' : ''}">
            ${game.players[0].nome}: ${game.players[0].pontos}
        </span> |
        <span class="${game.turno === 1 ? 'turno' : ''}">
            ${game.players[1].nome}: ${game.players[1].pontos}
        </span>
    `;
}

function logEvento(texto, tipo) {
    const ul = document.getElementById("log");

    const li = document.createElement("li");
    li.textContent = texto;

    if (tipo === "acerto") {
        li.classList.add("acerto");
    } else {
        li.classList.add("erro");
    }

    const primeiro = ul.firstChild;
    if (primeiro) {
        primeiro.classList.remove("recente");
    }

    ul.prepend(li);

    li.classList.add("recente");

    if (ul.children.length > 2) {
        ul.removeChild(ul.lastChild);
    }
}

function criarTabuleiro() {
    tabela.innerHTML = "";
    let index = 0;

    for (let i = 0; i < 4; i++) {
        const tr = document.createElement("tr");

        for (let j = 0; j < 4; j++) {
            const td = document.createElement("td");
            td.dataset.index = index;
            td.addEventListener("click", () => clicar(td));
            tr.appendChild(td);
            index++;
        }
        tabela.appendChild(tr);
    }
}

function clicar(td) {
    const card = game.cards[td.dataset.index];

    if (card.revelada) return;

    td.textContent = card.valor;
    td.classList.add("revelada");
    if (!game.first) {
        game.first = { card, td };
    } else {
        game.second = { card, td };
        setTimeout(verificar, 700);
    }
}

function verificar() {

    if (game.first.card.valor === game.second.card.valor) {
        game.first.card.revelada = true;
        game.second.card.revelada = true;

        game.players[game.turno].addPonto();

        logEvento(`${game.players[game.turno].nome} acertou!`, "acerto");

        game.first.td.classList.add("acertando");
        game.second.td.classList.add("acertando");

        setTimeout(() => {
            game.first.td.classList.remove("acertando");
            game.second.td.classList.remove("acertando");
            game.first.td.classList.add("acertou");
            game.second.td.classList.add("acertou");

            game.first = null;
            game.second = null;
            atualizarPlacar();
        }, 500);

        return;
    }

    logEvento(`${game.players[game.turno].nome} errou!`, "erro");

    game.first.td.classList.add("erro");
    game.second.td.classList.add("erro");

    setTimeout(() => {
        game.first.td.classList.remove("revelada", "erro");
        game.second.td.classList.remove("revelada", "erro");

        game.first.card.revelada = false;
        game.second.card.revelada = false;

        game.trocarTurno();
        atualizarPlacar();

        game.first = null;
        game.second = null;
    }, 600);
}

function resetTabuleiro() {
    while (tabela.firstChild) {
        tabela.removeChild(tabela.firstChild);
    }
}

resetTabuleiro()
criarTabuleiro();
atualizarPlacar();