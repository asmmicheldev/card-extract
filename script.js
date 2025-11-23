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

        // recalcula tabCount baseado nos IDs existentes
        const ids = Object.keys(tabsState.tabs)
            .map(id => parseInt(id.replace("tab_", "")))
            .filter(n => !isNaN(n));

        tabCount = ids.length > 0 ? Math.max(...ids) : 0;
    }
}


function createTabFromState(tabId, data) {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.id = tabId;

    // Clique na aba inteira
    tab.onclick = () => switchTab(tabId);

    // Título da aba
    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = data.title || "Card";

    // Botão de fechar
    const close = document.createElement("span");
    close.className = "close-tab";
    close.textContent = "×";
    close.onclick = (e) => {
        e.stopPropagation();

        const tabInfo = tabsState.tabs[tabId];
        const nomeAba = tabInfo?.title || "Card";

        const querFechar = confirm(`Tem certeza que deseja fechar a aba "${nomeAba}"?`);

        if (querFechar) {
            closeTab(tabId);
        }
    };

    tab.appendChild(title);
    tab.appendChild(close);

    const addBtn = document.getElementById("add-tab");
    document.getElementById("tabs-container").insertBefore(tab, addBtn);

    // Conteúdo
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
        title: "Card",
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

    // Atualiza SOMENTE o título da aba
    const tabTitle = document.querySelector(`#${tabId} .tab-title`);
    tabTitle.textContent = nome || "Card";

    // Atualiza estado
    tabsState.tabs[tabId].title = nome || "Card";
    tabsState.tabs[tabId].input = texto;
    tabsState.tabs[tabId].nome = nome;
    tabsState.tabs[tabId].descricao = desc;

    saveState();
}

function closeTab(tabId) {

    const tabElement = document.getElementById(tabId);

    // descobre a aba anterior e a próxima
    const prev = tabElement.previousElementSibling?.id;
    const next = tabElement.nextElementSibling?.id;

    // remove
    document.getElementById(tabId).remove();
    document.getElementById("content_" + tabId).remove();

    delete tabsState.tabs[tabId];

    // decide qual aba ativar
    let newActive = null;

    if (next && tabsState.tabs[next]) newActive = next;
    else if (prev && tabsState.tabs[prev]) newActive = prev;

    tabsState.activeTab = newActive;

    if (newActive) switchTab(newActive);

    saveState();
}


// Inicialização
loadState();

if (Object.keys(tabsState.tabs).length === 0) {
    createTab();
} else {
    for (const tabId in tabsState.tabs) {
        createTabFromState(tabId, tabsState.tabs[tabId]);
    }
    if (tabsState.activeTab && document.getElementById(tabsState.activeTab)) {
    switchTab(tabsState.activeTab);
} else {
    const first = Object.keys(tabsState.tabs)[0];
    if (first) switchTab(first);
}

}

document.getElementById("add-tab").onclick = createTab;
