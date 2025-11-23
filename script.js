function processar() {
    const input = document.getElementById("inputCard");
    const texto = input.value.trim();

    if (texto === "") {
        document.getElementById("nomeCard").value = "";
        document.getElementById("descricaoCard").value = "";
        return;
    }

    const partes = texto.split(" - ");

    if (partes.length < 3) {
        document.getElementById("nomeCard").value = "";
        document.getElementById("descricaoCard").value = "";
        return;
    }

    const nome = partes[1];
    const descricao = partes.slice(2).join(" - ");

    document.getElementById("nomeCard").value = nome;
    document.getElementById("descricaoCard").value = descricao;
}
