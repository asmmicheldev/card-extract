// ===================== ESTADO / STORAGE =====================

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

        const ids = Object.keys(tabsState.tabs)
            .map(id => parseInt(id.replace("tab_", "")))
            .filter(n => !isNaN(n));

        tabCount = ids.length > 0 ? Math.max(...ids) : 0;
    }
}

// helper pra setar valor em input/textarea
function setFieldValue(prefix, tabId, value) {
    const el = document.getElementById(prefix + tabId);
    if (el) {
        el.value = value || "";
    }
}

// ===================== CANAIS (>0) =====================

function renderCanais(tabId, canaisString) {
    const canaisContainer = document.getElementById("canais_" + tabId);
    if (!canaisContainer) return;

    canaisContainer.innerHTML = "";

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
        input.value = ch.valor;

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        canaisContainer.appendChild(wrapper);
    });
}

// ===================== PARSERS =====================

// ---- Divisão 1: título do card ----
function parseTitulo(linhas) {
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

    return { nome, descricao: desc };
}

// ---- Divisão 2: Informações Gerais ----
function parseInformacoesGerais(linhas) {
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

            if (!linha) continue;

            const upper = linha.toUpperCase();

            if (upper.startsWith("AREA:")) {
                area = linha.split(":")[1].trim();
            } else if (upper.startsWith("SOLICITANTE:")) {
                solicitante = linha.split(":")[1].trim();
            } else if (upper.startsWith("MARCA:")) {
                marca = linha.split(":")[1].trim();
            } else if (upper.startsWith("DESCRICAO CAMPANHA:")) {
                descCamp = linha.split(":")[1].trim();
            } else if (upper.startsWith("CANAIS:")) {
                let j = i + 1;
                while (j < subset.length && subset[j].trim() === "") {
                    j++;
                }
                if (j < subset.length) {
                    canais = subset[j].trim();
                }
            } else if (upper.startsWith("TEMPO ESTIMADO:")) {
                tempo = linha.split(":")[1].trim();
            }
        }
    }

    return { area, solicitante, marca, descCamp, canais, tempo };
}

// ---- Divisão 3: Dados ----
function parseDados(linhas) {
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

        while (endD < linhas.length && !/^-{3,}/.test(linhas[endD].trim())) {
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

            if (!base && viuFonte && !upper.startsWith("EXCLUIR") && !upper.startsWith("OBSERVACAO:")) {
                base = linha;
                continue;
            }

            if (upper.startsWith("OBSERVACAO:")) {
                observacao = linha.split(":").slice(1).join(":").trim();
            }
        }
    }

    return { base, observacao };
}

// ---- Divisão 5: Push (Comunicação 1) ----
function parsePush(linhas) {
    const idxComm = linhas.findIndex(l =>
        l.includes("COMUNICAÇÃO") && l.includes("(PUSH)")
    );
    if (idxComm === -1) {
        return {
            posicaoJornada: "",
            dataInicio: "",
            nomeCom: "",
            titulo: "",
            subtitulo: "",
            ctaType: "",
            url: "",
            temVar: "",
            tipoVar: "",
            observacao: ""
        };
    }

    let end = idxComm + 1;
    while (end < linhas.length) {
        const t = linhas[end].trim();
        if (t.startsWith("---------- COMUNICAÇÃO") && end > idxComm) break;
        end++;
    }

    const subset = linhas.slice(idxComm + 1, end);

    let posicaoJornada = "";
    let dataInicio = "";
    let nomeCom = "";
    let titulo = "";
    let subtitulo = "";
    let ctaType = "";
    let url = "";
    let temVar = "";
    let tipoVar = "";
    let observacao = "";

    subset.forEach(linhaRaw => {
        const linha = linhaRaw.trim();
        if (!linha) return;

        if (linha.startsWith("posicaoJornada:")) {
            posicaoJornada = linha.split(":")[1].trim();
        } else if (linha.startsWith("dataInicio:")) {
            dataInicio = linha.split(":")[1].trim();
        } else if (linha.startsWith("Nome Comunicação:")) {
            nomeCom = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Título:")) {
            titulo = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Subtítulo:")) {
            subtitulo = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("CTA Type:")) {
            ctaType = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("URL de Redirecionamento:")) {
            url = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Tem Váriavel?")) {
            temVar = linha.replace("Tem Váriavel?", "").trim();
        } else if (linha.startsWith("Tipo Váriavel:")) {
            tipoVar = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Observação:")) {
            observacao = linha.split(":").slice(1).join(":").trim();
        }
    });

    return {
        posicaoJornada,
        dataInicio,
        nomeCom,
        titulo,
        subtitulo,
        ctaType,
        url,
        temVar,
        tipoVar,
        observacao
    };
}

// ---- Divisão 6: Banner (Comunicação 1) ----
function parseBanner(linhas) {
    const idxComm = linhas.findIndex(l =>
        l.includes("COMUNICAÇÃO") && l.includes("(BANNER)")
    );
    if (idxComm === -1) {
        return {
            tipoExibicao: "",
            dataInicio: "",
            dataFim: "",
            periodoExibicao: "",
            nomeExp: "",
            tela: "",
            channel: "",
            contentZone: "",
            template: "",
            componentStyle: "",
            titulo: "",
            subtitulo: "",
            cta: "",
            url: "",
            imagem: "",
            observacao: "",
            json: ""
        };
    }

    let end = idxComm + 1;
    while (end < linhas.length) {
        const t = linhas[end].trim();
        if (t.startsWith("---------- COMUNICAÇÃO") && end > idxComm) break;
        end++;
    }

    const subset = linhas.slice(idxComm + 1, end);

    let tipoExibicao = "";
    let dataInicio = "";
    let dataFim = "";
    let periodoExibicao = "";
    let nomeExp = "";
    let tela = "";
    let channel = "";
    let contentZone = "";
    let template = "";
    let componentStyle = "";
    let titulo = "";
    let subtitulo = "";
    let cta = "";
    let url = "";
    let imagem = "";
    let observacao = "";
    let json = "";

    subset.forEach((linhaRaw, idx) => {
        const linha = linhaRaw.trim();
        if (!linha) return;

        if (linha.startsWith("tipoExibicao:")) {
            tipoExibicao = linha.split(":")[1].trim();
        } else if (linha.startsWith("dataInicio:")) {
            dataInicio = linha.split(":")[1].trim();
        } else if (linha.startsWith("dataFim:")) {
            dataFim = linha.split(":")[1].trim();
        } else if (linha.startsWith("periodoExibicao:")) {
            periodoExibicao = linha.split(":")[1].trim();
        } else if (linha.startsWith("Nome Experiência:")) {
            nomeExp = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Tela:")) {
            tela = linha.split(":")[1].trim();
        } else if (linha.startsWith("Channel:")) {
            channel = linha.split(":")[1].trim();
        } else if (linha.startsWith("ContentZone/CampaignPosition:")) {
            contentZone = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Template:")) {
            template = linha.split(":")[1].trim();
        } else if (linha.startsWith("ComponentStyle:")) {
            componentStyle = linha.split(":")[1].trim();
        } else if (linha.startsWith("Titulo:")) {
            titulo = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Subtitulo:")) {
            subtitulo = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("CTA:")) {
            cta = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("URL de Redirecionamento:")) {
            url = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Imagem:")) {
            imagem = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Observação:")) {
            observacao = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("JSON gerado:")) {
            const jsonLines = [];
            for (let j = idx + 1; j < subset.length; j++) {
                const l2 = subset[j];
                const t2 = l2.trim();
                if (t2.startsWith("---------- COMUNICAÇÃO")) break;
                jsonLines.push(l2);
            }
            json = jsonLines.join("\n").trim();
        }
    });

    return {
        tipoExibicao,
        dataInicio,
        dataFim,
        periodoExibicao,
        nomeExp,
        tela,
        channel,
        contentZone,
        template,
        componentStyle,
        titulo,
        subtitulo,
        cta,
        url,
        imagem,
        observacao,
        json
    };
}

// ---- Divisões 7 e 8: MktScreen / Bloco 1 ----
function parseMktScreen(linhas) {
    const idxComm = linhas.findIndex(l =>
        l.includes("COMUNICAÇÃO") && l.includes("(MKTSCREEN)")
    );
    if (idxComm === -1) {
        return {
            url: "",
            blocos: "",
            bloco1_nomeExp: "",
            bloco1_json: ""
        };
    }

    let end = idxComm + 1;
    while (end < linhas.length) {
        const t = linhas[end].trim();
        if (t.startsWith("---------- COMUNICAÇÃO") && end > idxComm) break;
        end++;
    }

    const subset = linhas.slice(idxComm + 1, end);

    let url = "";
    let blocos = "";

    const idxMktLine = subset.findIndex(l => l.trim() === "MktScreen");
    if (idxMktLine !== -1) {
        for (let i = idxMktLine + 1; i < subset.length; i++) {
            const linha = subset[i].trim();
            if (!linha) continue;
            if (linha.startsWith("URL:")) {
                url = linha.split(":").slice(1).join(":").trim();
            } else if (linha.startsWith("Blocos:")) {
                blocos = linha.split(":")[1].trim();
                break;
            } else if (linha.startsWith("---------- POSIÇÃO")) {
                break;
            }
        }
    }

    // Bloco 1
    let bloco1_nomeExp = "";
    let bloco1_json = "";

    const idxPos = subset.findIndex(l => l.trim().startsWith("---------- POSIÇÃO"));
    if (idxPos !== -1) {
        let endPos = idxPos + 1;
        while (endPos < subset.length) {
            const t = subset[endPos].trim();
            if (t.startsWith("---------- POSIÇÃO") && endPos > idxPos) break;
            endPos++;
        }

        const bloco1 = subset.slice(idxPos + 1, endPos);

        for (let i = 0; i < bloco1.length; i++) {
            const linha = bloco1[i].trim();
            if (!linha) continue;

            if (linha.startsWith("Nome Experiência:")) {
                bloco1_nomeExp = linha.split(":").slice(1).join(":").trim();
            } else if (linha.startsWith("JSON do")) {
                const jsonLines = [];
                for (let j = i + 1; j < bloco1.length; j++) {
                    jsonLines.push(bloco1[j]);
                }
                bloco1_json = jsonLines.join("\n").trim();
                break;
            }
        }
    }

    return { url, blocos, bloco1_nomeExp, bloco1_json };
}

// ===================== UI: CRIAÇÃO DE ABAS =====================

function createTabFromState(tabId, data) {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.id = tabId;

    tab.onclick = () => switchTab(tabId);

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = data.title || "Card";

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

    const content = document.createElement("div");
    content.className = "section";
    content.id = "content_" + tabId;

    // IMPORTANTE: para campos que podem ter ${} (JSON), deixo vazio e seto via JS depois.
    content.innerHTML = `
        <h2>Entrada do Card</h2>
        <div class="field">
            <label>Cole aqui o card completo:</label>
            <textarea class="input" rows="6"
                    oninput="processCard('${tabId}', this.value)">${data.input || ""}</textarea>
        </div>

        <h2>Divisão 1 — Título do Card</h2>
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
            <div id="canais_${tabId}" class="channels-wrapper"></div>
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

        <h2>Divisão 5 — Push (Comunicação 1)</h2>

        <div class="field">
            <label>posicaoJornada</label>
            <input id="push_posicao_${tabId}" class="readonly" type="text" readonly value="${data.push_posicao || ""}">
        </div>

        <div class="field">
            <label>dataInicio</label>
            <input id="push_dataInicio_${tabId}" class="readonly" type="text" readonly value="${data.push_dataInicio || ""}">
        </div>

        <div class="field">
            <label>Nome Comunicação</label>
            <input id="push_nome_${tabId}" class="readonly" type="text" readonly value="${data.push_nome || ""}">
        </div>

        <div class="field">
            <label>Título</label>
            <input id="push_titulo_${tabId}" class="readonly" type="text" readonly value="${data.push_titulo || ""}">
        </div>

        <div class="field">
            <label>Subtítulo</label>
            <input id="push_subtitulo_${tabId}" class="readonly" type="text" readonly value="${data.push_subtitulo || ""}">
        </div>

        <div class="field">
            <label>CTA Type</label>
            <input id="push_ctaType_${tabId}" class="readonly" type="text" readonly value="${data.push_ctaType || ""}">
        </div>

        <div class="field">
            <label>URL de Redirecionamento</label>
            <input id="push_url_${tabId}" class="readonly" type="text" readonly value="${data.push_url || ""}">
        </div>

        <div class="field">
            <label>Tem Variável?</label>
            <input id="push_temVar_${tabId}" class="readonly" type="text" readonly value="${data.push_temVar || ""}">
        </div>

        <div class="field">
            <label>Tipo Variável</label>
            <input id="push_tipoVar_${tabId}" class="readonly" type="text" readonly value="${data.push_tipoVar || ""}">
        </div>

        <div class="field">
            <label>Observação (Push)</label>
            <textarea id="push_obs_${tabId}" class="readonly readonly-multiline" readonly>${data.push_obs || ""}</textarea>
        </div>

        <h2>Divisão 6 — Banner (Comunicação 1)</h2>

        <div class="field">
            <label>tipoExibicao</label>
            <input id="banner_tipoExibicao_${tabId}" class="readonly" type="text" readonly value="${data.banner_tipoExibicao || ""}">
        </div>

        <div class="field">
            <label>dataInicio</label>
            <input id="banner_dataInicio_${tabId}" class="readonly" type="text" readonly value="${data.banner_dataInicio || ""}">
        </div>

        <div class="field">
            <label>dataFim</label>
            <input id="banner_dataFim_${tabId}" class="readonly" type="text" readonly value="${data.banner_dataFim || ""}">
        </div>

        <div class="field">
            <label>periodoExibicao</label>
            <input id="banner_periodoExibicao_${tabId}" class="readonly" type="text" readonly value="${data.banner_periodoExibicao || ""}">
        </div>

        <div class="field">
            <label>Nome Experiência</label>
            <input id="banner_nomeExp_${tabId}" class="readonly" type="text" readonly value="${data.banner_nomeExp || ""}">
        </div>

        <div class="field">
            <label>Tela</label>
            <input id="banner_tela_${tabId}" class="readonly" type="text" readonly value="${data.banner_tela || ""}">
        </div>

        <div class="field">
            <label>Channel</label>
            <input id="banner_channel_${tabId}" class="readonly" type="text" readonly value="${data.banner_channel || ""}">
        </div>

        <div class="field">
            <label>ContentZone/CampaignPosition</label>
            <input id="banner_contentZone_${tabId}" class="readonly" type="text" readonly value="${data.banner_contentZone || ""}">
        </div>

        <div class="field">
            <label>Template</label>
            <input id="banner_template_${tabId}" class="readonly" type="text" readonly value="${data.banner_template || ""}">
        </div>

        <div class="field">
            <label>ComponentStyle</label>
            <input id="banner_componentStyle_${tabId}" class="readonly" type="text" readonly value="${data.banner_componentStyle || ""}">
        </div>

        <div class="field">
            <label>Título</label>
            <input id="banner_titulo_${tabId}" class="readonly" type="text" readonly value="${data.banner_titulo || ""}">
        </div>

        <div class="field">
            <label>Subtitulo</label>
            <input id="banner_subtitulo_${tabId}" class="readonly" type="text" readonly value="${data.banner_subtitulo || ""}">
        </div>

        <div class="field">
            <label>CTA</label>
            <input id="banner_cta_${tabId}" class="readonly" type="text" readonly value="${data.banner_cta || ""}">
        </div>

        <div class="field">
            <label>URL de Redirecionamento</label>
            <input id="banner_url_${tabId}" class="readonly" type="text" readonly value="${data.banner_url || ""}">
        </div>

        <div class="field">
            <label>Imagem</label>
            <input id="banner_imagem_${tabId}" class="readonly" type="text" readonly value="${data.banner_imagem || ""}">
        </div>

        <div class="field">
            <label>Observação (Banner)</label>
            <textarea id="banner_obs_${tabId}" class="readonly readonly-multiline" readonly>${data.banner_obs || ""}</textarea>
        </div>

        <div class="field">
            <label>JSON gerado (Banner)</label>
            <textarea id="banner_json_${tabId}" class="readonly readonly-multiline" readonly></textarea>
        </div>

        <h2>Divisão 7 — MktScreen</h2>

        <div class="field">
            <label>URL MktScreen</label>
            <input id="mkt_url_${tabId}" class="readonly" type="text" readonly value="${data.mkt_url || ""}">
        </div>

        <div class="field">
            <label>Blocos</label>
            <input id="mkt_blocos_${tabId}" class="readonly" type="text" readonly value="${data.mkt_blocos || ""}">
        </div>

        <h2>Divisão 8 — Bloco 1 da MktScreen</h2>

        <div class="field">
            <label>Nome Experiência (Bloco 1)</label>
            <input id="mkt1_nomeExp_${tabId}" class="readonly" type="text" readonly value="${data.mkt1_nomeExp || ""}">
        </div>

        <div class="field">
            <label>JSON do Bloco 1</label>
            <textarea id="mkt1_json_${tabId}" class="readonly readonly-multiline" readonly></textarea>
        </div>
    `;

    document.getElementById("content-container").appendChild(content);

    // repopula canais
    if (data.canais) {
        renderCanais(tabId, data.canais);
    }

    // JSONs (não podem ir dentro do template literal por causa de ${...})
    const bannerJsonEl = document.getElementById(`banner_json_${tabId}`);
    if (bannerJsonEl) {
        bannerJsonEl.value = data.banner_json || "";
    }

    const mkt1JsonEl = document.getElementById(`mkt1_json_${tabId}`);
    if (mkt1JsonEl) {
        mkt1JsonEl.value = data.mkt1_json || "";
    }

    tabCount++;
}

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
        observacao: "",
        // push
        push_posicao: "",
        push_dataInicio: "",
        push_nome: "",
        push_titulo: "",
        push_subtitulo: "",
        push_ctaType: "",
        push_url: "",
        push_temVar: "",
        push_tipoVar: "",
        push_obs: "",
        // banner
        banner_tipoExibicao: "",
        banner_dataInicio: "",
        banner_dataFim: "",
        banner_periodoExibicao: "",
        banner_nomeExp: "",
        banner_tela: "",
        banner_channel: "",
        banner_contentZone: "",
        banner_template: "",
        banner_componentStyle: "",
        banner_titulo: "",
        banner_subtitulo: "",
        banner_cta: "",
        banner_url: "",
        banner_imagem: "",
        banner_obs: "",
        banner_json: "",
        // mkt screen
        mkt_url: "",
        mkt_blocos: "",
        mkt1_nomeExp: "",
        mkt1_json: ""
    };

    createTabFromState(tabId, tabsState.tabs[tabId]);
    switchTab(tabId);
    saveState();
}

function switchTab(tabId) {
    tabsState.activeTab = tabId;

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach(c => c.style.display = "none");

    const tabEl = document.getElementById(tabId);
    const contentEl = document.getElementById("content_" + tabId);

    if (tabEl && contentEl) {
        tabEl.classList.add("active");
        contentEl.style.display = "block";
    }

    saveState();
}

// ===================== PROCESSAMENTO DO CARD =====================

function processCard(tabId, texto) {
    texto = texto || "";
    const linhas = texto.split(/\r?\n/);

    const titulo = parseTitulo(linhas);
    const info = parseInformacoesGerais(linhas);
    const dados = parseDados(linhas);
    const push = parsePush(linhas);
    const banner = parseBanner(linhas);
    const mkt = parseMktScreen(linhas);

    // Divisão 1
    setFieldValue("nome_", tabId, titulo.nome);
    setFieldValue("desc_", tabId, titulo.descricao);

    const tabTitle = document.querySelector(`#${tabId} .tab-title`);
    if (tabTitle) {
        tabTitle.textContent = titulo.nome || "Card";
    }

    // Divisão 2
    setFieldValue("area_", tabId, info.area);
    setFieldValue("solicitante_", tabId, info.solicitante);
    setFieldValue("marca_", tabId, info.marca);
    setFieldValue("descCamp_", tabId, info.descCamp);
    setFieldValue("tempo_", tabId, info.tempo);
    renderCanais(tabId, info.canais);

    // Divisão 3
    setFieldValue("base_", tabId, dados.base);
    setFieldValue("obs_", tabId, dados.observacao);

    // Divisão 5 — Push
    setFieldValue("push_posicao_", tabId, push.posicaoJornada);
    setFieldValue("push_dataInicio_", tabId, push.dataInicio);
    setFieldValue("push_nome_", tabId, push.nomeCom);
    setFieldValue("push_titulo_", tabId, push.titulo);
    setFieldValue("push_subtitulo_", tabId, push.subtitulo);
    setFieldValue("push_ctaType_", tabId, push.ctaType);
    setFieldValue("push_url_", tabId, push.url);
    setFieldValue("push_temVar_", tabId, push.temVar);
    setFieldValue("push_tipoVar_", tabId, push.tipoVar);
    setFieldValue("push_obs_", tabId, push.observacao);

    // Divisão 6 — Banner
    setFieldValue("banner_tipoExibicao_", tabId, banner.tipoExibicao);
    setFieldValue("banner_dataInicio_", tabId, banner.dataInicio);
    setFieldValue("banner_dataFim_", tabId, banner.dataFim);
    setFieldValue("banner_periodoExibicao_", tabId, banner.periodoExibicao);
    setFieldValue("banner_nomeExp_", tabId, banner.nomeExp);
    setFieldValue("banner_tela_", tabId, banner.tela);
    setFieldValue("banner_channel_", tabId, banner.channel);
    setFieldValue("banner_contentZone_", tabId, banner.contentZone);
    setFieldValue("banner_template_", tabId, banner.template);
    setFieldValue("banner_componentStyle_", tabId, banner.componentStyle);
    setFieldValue("banner_titulo_", tabId, banner.titulo);
    setFieldValue("banner_subtitulo_", tabId, banner.subtitulo);
    setFieldValue("banner_cta_", tabId, banner.cta);
    setFieldValue("banner_url_", tabId, banner.url);
    setFieldValue("banner_imagem_", tabId, banner.imagem);
    setFieldValue("banner_obs_", tabId, banner.observacao);

    const bannerJsonEl = document.getElementById(`banner_json_${tabId}`);
    if (bannerJsonEl) {
        bannerJsonEl.value = banner.json || "";
    }

    // Divisão 7 — MktScreen
    setFieldValue("mkt_url_", tabId, mkt.url);
    setFieldValue("mkt_blocos_", tabId, mkt.blocos);

    // Divisão 8 — Bloco 1
    setFieldValue("mkt1_nomeExp_", tabId, mkt.bloco1_nomeExp);
    const mkt1JsonEl = document.getElementById(`mkt1_json_${tabId}`);
    if (mkt1JsonEl) {
        mkt1JsonEl.value = mkt.bloco1_json || "";
    }

    // Atualiza estado
    const tabData = tabsState.tabs[tabId];

    tabData.title       = titulo.nome || "Card";
    tabData.input       = texto;
    tabData.nome        = titulo.nome;
    tabData.descricao   = titulo.descricao;

    tabData.area        = info.area;
    tabData.solicitante = info.solicitante;
    tabData.marca       = info.marca;
    tabData.descCamp    = info.descCamp;
    tabData.canais      = info.canais;
    tabData.tempo       = info.tempo;

    tabData.base        = dados.base;
    tabData.observacao  = dados.observacao;

    tabData.push_posicao     = push.posicaoJornada;
    tabData.push_dataInicio  = push.dataInicio;
    tabData.push_nome        = push.nomeCom;
    tabData.push_titulo      = push.titulo;
    tabData.push_subtitulo   = push.subtitulo;
    tabData.push_ctaType     = push.ctaType;
    tabData.push_url         = push.url;
    tabData.push_temVar      = push.temVar;
    tabData.push_tipoVar     = push.tipoVar;
    tabData.push_obs         = push.observacao;

    tabData.banner_tipoExibicao   = banner.tipoExibicao;
    tabData.banner_dataInicio     = banner.dataInicio;
    tabData.banner_dataFim        = banner.dataFim;
    tabData.banner_periodoExibicao= banner.periodoExibicao;
    tabData.banner_nomeExp        = banner.nomeExp;
    tabData.banner_tela           = banner.tela;
    tabData.banner_channel        = banner.channel;
    tabData.banner_contentZone    = banner.contentZone;
    tabData.banner_template       = banner.template;
    tabData.banner_componentStyle = banner.componentStyle;
    tabData.banner_titulo         = banner.titulo;
    tabData.banner_subtitulo      = banner.subtitulo;
    tabData.banner_cta            = banner.cta;
    tabData.banner_url            = banner.url;
    tabData.banner_imagem         = banner.imagem;
    tabData.banner_obs            = banner.observacao;
    tabData.banner_json           = banner.json;

    tabData.mkt_url        = mkt.url;
    tabData.mkt_blocos     = mkt.blocos;
    tabData.mkt1_nomeExp   = mkt.bloco1_nomeExp;
    tabData.mkt1_json      = mkt.bloco1_json;

    saveState();
}

// ===================== FECHAR ABA =====================

function closeTab(tabId) {
    const tabElement = document.getElementById(tabId);
    if (!tabElement) return;

    const prev = tabElement.previousElementSibling?.id;
    const next = tabElement.nextElementSibling?.id;

    document.getElementById(tabId).remove();
    const contentEl = document.getElementById("content_" + tabId);
    if (contentEl) contentEl.remove();

    delete tabsState.tabs[tabId];

    let newActive = null;
    if (next && tabsState.tabs[next]) newActive = next;
    else if (prev && tabsState.tabs[prev]) newActive = prev;

    tabsState.activeTab = newActive;

    if (newActive) switchTab(newActive);

    saveState();
}

// ===================== INICIALIZAÇÃO =====================

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
