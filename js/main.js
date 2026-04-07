document.getElementById("startBtn").addEventListener("click", () => {
    const p1 = document.getElementById("p1").value;
    const p2 = document.getElementById("p2").value;

    if (!p1 || !p2) {
        alert("Digite os nomes!");
        return;
    }

    window.location.href = `jogo.html?p1=${p1}&p2=${p2}`;
});