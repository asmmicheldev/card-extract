let tabCount = 0;
let activeTabId = null;

function createTab() {
    tabCount++;
    const tabId = "tab_" + tabCount;

    // Criar aba
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.id = tabId;
    tab.textContent = "Card " + tabCount;
    tab.onclick = () => switchTab(tabId);

    // Inserir antes do botão "+"
    const addBtn = document.getElementById("add-tab");
    document.getElementById("tabs-container").insertBefore(tab, addBtn);

    // Criar conteúdo da aba
    const content = document.createElement("div");
    content.className = "section";
    content.id = "content_" + tabId;

    content.innerHTML = `
        <h2>Entrada do Card</h2>
        <div class="field">
            <label>Cole aqui o título completo do card:</label>
            <input class="input" type="text" oninput="processCard('${tabId}', this.value)">
        </div>

        <h2>Resultado (Divisão 1)</h2>
        <div class="field">
            <label>Nome do Card / Jornada</label>
            <input id="nome_${tabId}" class="readonly" type="text" readonly>
        </div>

        <div class="field">
            <label>Descrição do Card</label>
            <input id="desc_${tabId}" class="readonly" type="text" readonly>
        </div>
    `;

    document.getElementById("content-container").appendChild(content);

    // Ativar a aba nova
    switchTab(tabId);
}

function switchTab(tabId) {
    activeTabId = tabId;

    // Desativar todas as abas
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    // Ocultar todos os conteúdos
    document.querySelectorAll(".section").forEach(c => c.style.display = "none");

    // Ativar aba clicada
    document.getElementById(tabId).classList.add("active");

    // Exibir conteúdo correspondente
    document.getElementById("content_" + tabId).style.display = "block";
}

function processCard(tabId, texto) {
    texto = texto.trim();

    const partes = texto.split(" - ");

    if (partes.length < 3) {
        document.getElementById("nome_" + tabId).value = "";
        document.getElementById("desc_" + tabId).value = "";
        return;
    }

    const nome = partes[1];
    const desc = partes.slice(2).join(" - ");

    document.getElementById("nome_" + tabId).value = nome;
    document.getElementById("desc_" + tabId).value = desc;

    // Atualiza nome da aba automaticamente
    document.getElementById(tabId).textContent = nome;
}

// Criar primeira aba automaticamente
createTab();
document.getElementById("add-tab").onclick = createTab;
