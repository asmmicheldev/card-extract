let tabsState = {
    tabs: {},
    activeTab: null
};

let tabCount = 0;

function saveState() {
    localStorage.setItem("cardExtractData", JSON.stringify(tabsState));
}

function loadState() {
    const saved = localStorage.getItem("cardExtractData");
    if (saved) {
        tabsState = JSON.parse(saved);
    }
}

function createTabFromState(tabId, data) {
    // Criar aba visual
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.id = tabId;
    tab.textContent = data.title || "Card";
    tab.onclick = () => switchTab(tabId);

    const addBtn = document.getElementById("add-tab");
    document.getElementById("tabs-container").insertBefore(tab, addBtn);

    // Criar conteúdo
    const content = document.createElement("div");
    content.className = "section";
    content.id = "content_" + tabId;

    content.innerHTML = `
        <h2>Entrada do Card</h2>
        <div class="field">
            <label>Cole aqui o título completo do card:</label>
            <input class="input" type="text" value="${data.input || ""}" oninput="processCard('${tabId}', this.value)">
        </div>

        <h2>Resultado (Divisão 1)</h2>
        <div class="field">
            <label>Nome do Card / Jornada</label>
            <input id="nome_${tabId}" class="readonly" type="text" readonly value="${data.nome || ""}">
        </div>

        <div class="field">
            <label>Descrição do Card</label>
            <input id="desc_${tabId}" class="readonly" type="text" readonly value="${data.descricao || ""}">
        </div>
    `;

    document.getElementById("content-container").appendChild(content);

    tabCount++;
}

function createTab() {
    const tabId = "tab_" + (tabCount + 1);

    tabsState.tabs[tabId] = {
        title: "Card " + (tabCount + 1),
        input: "",
        nome: "",
        descricao: ""
    };

    createTabFromState(tabId, tabsState.tabs[tabId]);
    switchTab(tabId);
    saveState();
}

function switchTab(tabId) {
    tabsState.activeTab = tabId;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach(c => c.style.display = "none");

    document.getElementById(tabId).classList.add("active");
    document.getElementById("content_" + tabId).style.display = "block";

    saveState();
}

function processCard(tabId, texto) {
    texto = texto.trim();

    const partes = texto.split(" - ");

    let nome = "";
    let desc = "";

    if (partes.length >= 3) {
        nome = partes[1];
        desc = partes.slice(2).join(" - ");
    }

    document.getElementById("nome_" + tabId).value = nome;
    document.getElementById("desc_" + tabId).value = desc;

    document.getElementById(tabId).textContent = nome || "Card";

    // Atualiza estado
    tabsState.tabs[tabId].title = nome || "Card";
    tabsState.tabs[tabId].input = texto;
    tabsState.tabs[tabId].nome = nome;
    tabsState.tabs[tabId].descricao = desc;

    saveState();
}

// Inicialização da página
loadState();

if (Object.keys(tabsState.tabs).length === 0) {
    createTab(); // cria aba inicial
} else {
    for (const tabId in tabsState.tabs) {
        createTabFromState(tabId, tabsState.tabs[tabId]);
    }
    switchTab(tabsState.activeTab);
}

document.getElementById("add-tab").onclick = createTab;
