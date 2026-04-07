import { Player } from "./Player.js";
import { Card } from "./Card.js";

export class Game {
    constructor(p1, p2) {
        this.players = [new Player(p1), new Player(p2)];
        this.turno = 0;
        this.cards = [];
        this.first = null;
        this.second = null;
    }

    gerarCartas() {
        const valores = [
            '😁','😁',
            '😍','😍',
            '😝','😝',
            '😎','😎',
            '😭','😭',
            '🤓','🤓',
            '😡','😡',
            '😏','😏'
        ];
        this.cards = valores.sort(() => Math.random() - 0.5)
            .map(v => new Card(v));
    }

    trocarTurno() {
        this.turno = this.turno === 0 ? 1 : 0;
    }
}