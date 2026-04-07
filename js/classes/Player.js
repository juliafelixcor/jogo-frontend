export class Player {
    constructor(nome) {
        this.nome = nome;
        this.pontos = 0;
    }

    addPonto() {
        this.pontos++;
    }
}