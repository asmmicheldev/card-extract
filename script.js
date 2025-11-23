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

/* ---------- helper para montar os canais (>0) ---------- */
function renderCanais(tabId, canaisString) {
    const canaisContainer = document.getElementById("canais_" + tabId);
    if (!canaisContainer) return;

    canaisContainer.innerHTML = ""; // limpa o que tinha

    if (!canaisString) return;

    const canaisAtivos = [];

    canaisString.split("|").forEach(part => {
        const p = part.trim();
        if (!p) return;

        const [nomeRaw, valorRaw] = p.split(":");
        if (!nomeRaw || !valorRaw) return;

        const nomeCanal = nomeRaw.trim();
        const num = parseInt(valorRaw.trim(), 10);

        if (!isNaN(num) && num > 0) {
            canaisAtivos.push({ nome: nomeCanal, valor: num });
        }
    });

    canaisAtivos.forEach(ch => {
        const wrapper = document.createElement("div");
        wrapper.className = "channel-field";

        const label = document.createElement("label");
        label.textContent = ch.nome;

        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.className = "readonly channel-input";
        input.value = ch.valor; // só número

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        canaisContainer.appendChild(wrapper);
    });
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
            <label>Cole aqui o card completo:</label>
            <textarea class="input" rows="6"
                    oninput="processCard('${tabId}', this.value)">${data.input || ""}</textarea>
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

        <h2>Divisão 2 — Informações Gerais</h2>

        <div class="field">
            <label>AREA</label>
            <input id="area_${tabId}" class="readonly" type="text" readonly value="${data.area || ""}">
        </div>

        <div class="field">
            <label>SOLICITANTE</label>
            <input id="solicitante_${tabId}" class="readonly" type="text" readonly value="${data.solicitante || ""}">
        </div>

        <div class="field">
            <label>MARCA</label>
            <input id="marca_${tabId}" class="readonly" type="text" readonly value="${data.marca || ""}">
        </div>

        <div class="field">
            <label>DESCRICAO CAMPANHA</label>
            <input id="descCamp_${tabId}" class="readonly" type="text" readonly value="${data.descCamp || ""}">
        </div>

        <div class="field">
            <label>Canais (somente > 0)</label>
            <div id="canais_${tabId}" class="channels-wrapper">
                <!-- inputs dos canais ativos serão criados via JS -->
            </div>
        </div>
        
        <div class="field">
            <label>Tempo Estimado</label>
            <input id="tempo_${tabId}" class="readonly" type="text" readonly value="${data.tempo || ""}">
        </div>

        <h2>Divisão 3 — Dados</h2>

        <div class="field">
            <label>Base</label>
            <input id="base_${tabId}" class="readonly" type="text" readonly value="${data.base || ""}">
        </div>

        <div class="field">
            <label>Observação</label>
            <textarea id="obs_${tabId}" class="readonly readonly-multiline" readonly>${data.observacao || ""}</textarea>
        </div>
    `;

    document.getElementById("content-container").appendChild(content);

    // repopula os canais após reload
    if (data.canais) {
        renderCanais(tabId, data.canais);
    }

    tabCount++;
}

/* ---------- criação de nova aba ---------- */
function createTab() {
    tabCount += 1;
    const tabId = "tab_" + tabCount;

    tabsState.tabs[tabId] = {
        title: "Card",
        input: "",
        nome: "",
        descricao: "",
        area: "",
        solicitante: "",
        marca: "",
        descCamp: "",
        canais: "",
        tempo: "",
        base: "",
        observacao: ""
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
    texto = texto || "";
    const linhas = texto.split(/\r?\n/);

    // ====== DIVISÃO 1: TÍTULO DO CARD ======
    let tituloLinha = "";
    for (const l of linhas) {
        const t = l.trim();
        if (t !== "") {
            tituloLinha = t;
            break;
        }
    }

    let nome = "";
    let desc = "";

    if (tituloLinha) {
        const partes = tituloLinha.split(" - ");
        if (partes.length >= 3) {
            nome = partes[1];
            desc = partes.slice(2).join(" - ");
        }
    }

    const nomeEl = document.getElementById("nome_" + tabId);
    const descEl = document.getElementById("desc_" + tabId);
    if (nomeEl) nomeEl.value = nome;
    if (descEl) descEl.value = desc;

    const tabTitle = document.querySelector(`#${tabId} .tab-title`);
    if (tabTitle) {
        tabTitle.textContent = nome || "Card";
    }

    // ====== DIVISÃO 2: INFORMAÇÕES GERAIS ======
    let area = "";
    let solicitante = "";
    let marca = "";
    let descCamp = "";
    let canais = "";
    let tempo = "";

    const idxInfo = linhas.findIndex(l =>
        l.toUpperCase().includes("INFORMAÇÕES GERAIS")
    );

    if (idxInfo !== -1) {
        let start = idxInfo + 1;
        while (start < linhas.length && linhas[start].trim() === "") {
            start++;
        }

        let end = start;
        while (end < linhas.length && !/^-{3,}/.test(linhas[end].trim())) {
            end++;
        }

        const subset = linhas.slice(start, end);

        for (let i = 0; i < subset.length; i++) {
            const linha = subset[i].trim();

            if (linha.toUpperCase().startsWith("AREA:")) {
                area = linha.split(":")[1].trim();
            } else if (linha.toUpperCase().startsWith("SOLICITANTE:")) {
                solicitante = linha.split(":")[1].trim();
            } else if (linha.toUpperCase().startsWith("MARCA:")) {
                marca = linha.split(":")[1].trim();
            } else if (linha.toUpperCase().startsWith("DESCRICAO CAMPANHA:")) {
                descCamp = linha.split(":")[1].trim();
            } else if (linha.toUpperCase().startsWith("CANAIS:")) {
                let j = i + 1;
                while (j < subset.length && subset[j].trim() === "") {
                    j++;
                }
                if (j < subset.length) {
                    canais = subset[j].trim();
                }
            } else if (linha.toUpperCase().startsWith("TEMPO ESTIMADO:")) {
                tempo = linha.split(":")[1].trim();
            }
        }
    }

    // ====== DIVISÃO 3: DADOS ======
    let base = "";
    let observacao = "";

    const idxDados = linhas.findIndex(l =>
        l.toUpperCase().includes("DADOS")
    );

    if (idxDados !== -1) {
        let startD = idxDados + 1;

        while (startD < linhas.length && linhas[startD].trim() === "") {
            startD++;
        }

        let endD = startD;

        while (
            endD < linhas.length &&
            !/^-{3,}/.test(linhas[endD].trim())
        ) {
            endD++;
        }

        const subsetD = linhas.slice(startD, endD);
        let viuFonte = false;

        for (let i = 0; i < subsetD.length; i++) {
            const linha = subsetD[i].trim();
            if (!linha) continue;

            const upper = linha.toUpperCase();

            if (upper.startsWith("FONTE DE DADOS:")) {
                viuFonte = true;
                continue;
            }

            // primeira linha depois de "FONTE DE DADOS:" que não é EXCLUIR/OBSERVACAO vira a Base
            if (!base && viuFonte && !upper.startsWith("EXCLUIR") && !upper.startsWith("OBSERVACAO:")) {
                base = linha;
                continue;
            }

            if (upper.startsWith("OBSERVACAO:")) {
                observacao = linha.split(":").slice(1).join(":").trim();
            }
        }
    }

    // Preenche campos das divisões 2 e 3
    const areaEl        = document.getElementById("area_" + tabId);
    const solicEl       = document.getElementById("solicitante_" + tabId);
    const marcaEl       = document.getElementById("marca_" + tabId);
    const descCampEl    = document.getElementById("descCamp_" + tabId);
    const tempoEl       = document.getElementById("tempo_" + tabId);
    const baseEl        = document.getElementById("base_" + tabId);
    const obsEl         = document.getElementById("obs_" + tabId);

    if (areaEl)     areaEl.value = area;
    if (solicEl)    solicEl.value = solicitante;
    if (marcaEl)    marcaEl.value = marca;
    if (descCampEl) descCampEl.value = descCamp;
    if (tempoEl)    tempoEl.value = tempo;
    if (baseEl)     baseEl.value = base;
    if (obsEl)      obsEl.value  = observacao;

    // monta canais a partir da string
    renderCanais(tabId, canais);

    // ====== Atualiza estado ======
    const tabData = tabsState.tabs[tabId];
    tabData.title      = nome || "Card";
    tabData.input      = texto;
    tabData.nome       = nome;
    tabData.descricao  = desc;
    tabData.area       = area;
    tabData.solicitante= solicitante;
    tabData.marca      = marca;
    tabData.descCamp   = descCamp;
    tabData.canais     = canais;
    tabData.tempo      = tempo;
    tabData.base       = base;
    tabData.observacao = observacao;

    saveState();
}

function closeTab(tabId) {
    const tabElement = document.getElementById(tabId);

    const prev = tabElement.previousElementSibling?.id;
    const next = tabElement.nextElementSibling?.id;

    document.getElementById(tabId).remove();
    document.getElementById("content_" + tabId).remove();

    delete tabsState.tabs[tabId];

    let newActive = null;
    if (next && tabsState.tabs[next]) newActive = next;
    else if (prev && tabsState.tabs[prev]) newActive = prev;

    tabsState.activeTab = newActive;

    if (newActive) switchTab(newActive);

    saveState();
}

/* ---------- inicialização ---------- */
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
