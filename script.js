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

// helper pra setar texto em spans/divs
function setTextValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value || "";
    }
}

// auto-resize de textareas para não ficar gigante
function autoResizeTextareas(tabId) {
    const content = document.getElementById("content_" + tabId);
    if (!content) return;
    const textareas = content.querySelectorAll("textarea.readonly-multiline");
    textareas.forEach(t => {
        t.style.height = "auto";
        t.style.height = (t.scrollHeight + 4) + "px";
    });
}

// ===================== CANAIS (>0) =====================

function renderCanais(tabId, canaisString) {
    const span = document.getElementById("canaisText_" + tabId);
    if (!span) return;

    if (!canaisString) {
        span.textContent = "";
        return;
    }

    const canaisAtivos = [];

    canaisString.split("|").forEach(part => {
        const p = part.trim();
        if (!p) return;

        const [nomeRaw, valorRaw] = p.split(":");
        if (!nomeRaw || !valorRaw) return;

        const nomeCanal = nomeRaw.trim();
        const num = parseInt(valorRaw.trim(), 10);

        if (!isNaN(num) && num > 0) {
            canaisAtivos.push(`${nomeCanal} (${num})`);
        }
    });

    span.textContent = canaisAtivos.join("   ");
}


// ===================== PARSERS BÁSICOS =====================

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

// ===================== PARSE DE COMUNICAÇÕES =====================

// Quebra o card em blocos de comunicação
function splitCommunications(linhas) {
    const blocks = [];
    for (let i = 0; i < linhas.length; i++) {
        const line = linhas[i].trim();
        if (line.startsWith("---------- COMUNICAÇÃO")) {
            const header = line;
            let j = i + 1;
            while (j < linhas.length && !linhas[j].trim().startsWith("---------- COMUNICAÇÃO")) {
                j++;
            }
            const subset = linhas.slice(i + 1, j);

            let numero = null;
            let posicao = "";
            let tipo = "";

            const match = header.match(/COMUNICAÇÃO\s+(\d+)\s*-\s*([^-]+)\s*\(([^)]+)\)/i);
            if (match) {
                numero = parseInt(match[1], 10);
                posicao = match[2].trim();
                tipo = match[3].trim().toUpperCase(); // PUSH / BANNER / MKTSCREEN
            }

            blocks.push({ header, numero, posicao, tipo, lines: subset });
            i = j - 1;
        }
    }
    return blocks;
}

// ---- Push: um bloco de comunicação (PUSH) ----
function parsePushBlock(subset) {
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
        } else if (linha.startsWith("Tem Variável?")) {
            temVar = linha.replace("Tem Variável?", "").trim();
        } else if (linha.startsWith("Tipo Váriavel:")) {
            tipoVar = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Tipo Variável:")) {
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

// ---- Banner: um bloco de comunicação (BANNER) ----
function parseBannerBlock(subset) {
    let tipoExibicao = "";
    let dataInicio = "";
    let dataFim = "";
    let periodoExibicao = "";
    let nomeCampanha = "";
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
        } else if (linha.startsWith("Nome Campanha:")) {
            nomeCampanha = linha.split(":").slice(1).join(":").trim();
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
                jsonLines.push(subset[j]);
            }
            json = jsonLines.join("\n").trim();
        }
    });

    return {
        tipoExibicao,
        dataInicio,
        dataFim,
        periodoExibicao,
        nomeCampanha,
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

// ---- MktScreen: bloco de comunicação (MKTSCREEN) ----

function parseMktBloco(blocoLines) {
    let nomeCampanha = "";
    let nomeExp = "";
    let template = "";
    let titulo = "";
    let subtitulo = "";
    let imagem = "";
    let json = "";

    for (let i = 0; i < blocoLines.length; i++) {
        const linha = blocoLines[i].trim();
        if (!linha) continue;

        if (linha.startsWith("Nome Campanha:")) {
            nomeCampanha = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Nome Experiência:")) {
            nomeExp = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Template:")) {
            template = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("Titulo") || linha.startsWith("Título")) {
            const partes = linha.split(":");
            partes.shift();
            titulo = partes.join(":").trim();
        } else if (linha.startsWith("Subtitulo") || linha.startsWith("Subtítulo")) {
            const partes = linha.split(":");
            partes.shift();
            subtitulo = partes.join(":").trim();
        } else if (linha.startsWith("Imagem:")) {
            imagem = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("JSON do")) {
            const jsonLines = [];
            for (let j = i + 1; j < blocoLines.length; j++) {
                jsonLines.push(blocoLines[j]);
            }
            json = jsonLines.join("\n").trim();
            break;
        }
    }

    return { nomeCampanha, nomeExp, template, titulo, subtitulo, imagem, json };
}

function parseMktScreenBlock(subset) {
    let posicaoJornada = "";
    let url = "";
    let blocosQtd = "";
    let nomeExpMacro = "";
    const blocos = [];

    // Nome Experiência macro (pega o primeiro que aparecer)
    for (const l of subset) {
        const linha = l.trim();
        if (linha.startsWith("Nome Experiência:")) {
            nomeExpMacro = linha.split(":").slice(1).join(":").trim();
            break;
        }
    }

    const linhaPos = subset.find(l => l.trim().startsWith("posicaoJornada:"));
    if (linhaPos) {
        posicaoJornada = linhaPos.split(":")[1].trim();
    }

    const idxMktLine = subset.findIndex(l => l.trim() === "MktScreen");
    if (idxMktLine !== -1) {
        for (let i = idxMktLine + 1; i < subset.length; i++) {
            const linha = subset[i].trim();
            if (!linha) continue;

            if (linha.startsWith("URL:")) {
                url = linha.split(":").slice(1).join(":").trim();
            } else if (linha.startsWith("Blocos:")) {
                blocosQtd = linha.split(":")[1].trim();
            } else if (linha.startsWith("---------- POSIÇÃO")) {
                break;
            }
        }
    }

    for (let i = 0; i < subset.length; i++) {
        const line = subset[i].trim();
        if (line.startsWith("---------- POSIÇÃO")) {
            let numero = null;
            const m = line.match(/POSIÇÃO\s+(\d+)/i);
            if (m) {
                numero = parseInt(m[1], 10);
            }

            let j = i + 1;
            while (j < subset.length && !subset[j].trim().startsWith("---------- POSIÇÃO")) {
                j++;
            }
            const blocoLines = subset.slice(i + 1, j);
            const parsed = parseMktBloco(blocoLines);
            blocos.push({ numero, ...parsed });
            i = j - 1;
        }
    }

    return { posicaoJornada, url, blocosQtd, nomeExpMacro, blocos };
}

// Juntando tudo
function parseCommunications(linhas) {
    const blocks = splitCommunications(linhas);

    const pushes = [];
    const banners = [];
    let mktScreen = null;

    blocks.forEach(b => {
        if (b.tipo === "PUSH") {
            const parsed = parsePushBlock(b.lines);
            pushes.push({
                numero: b.numero,
                posicaoHeader: b.posicao,
                ...parsed
            });
        } else if (b.tipo === "BANNER") {
            const parsed = parseBannerBlock(b.lines);
            banners.push({
                numero: b.numero,
                ...parsed
            });
        } else if (b.tipo === "MKTSCREEN") {
            const parsed = parseMktScreenBlock(b.lines);
            mktScreen = {
                numero: b.numero,
                posicaoHeader: b.posicao,
                ...parsed
            };
        }
    });

    return { pushes, banners, mktScreen };
}

// ===================== RENDER DE LISTAS (PUSH / BANNER / MKT) =====================

function renderPushList(tabId, pushes) {
    const container = document.getElementById("push_container_" + tabId);
    if (!container) return;

    container.innerHTML = "";

    if (!pushes || pushes.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-hint";
        empty.textContent = "Nenhum push encontrado neste card.";
        container.appendChild(empty);
        return;
    }

    pushes.forEach((p, index) => {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("div");
        header.className = "accordion-header accordion-header-small";
        header.dataset.accordionTarget = `push_${tabId}_${index}`;

        const titleSpan = document.createElement("span");
        titleSpan.className = "accordion-title";
        const num = p.numero || (index + 1);
        titleSpan.textContent = `Push ${num}`;

        const arrow = document.createElement("span");
        arrow.className = "accordion-arrow";
        arrow.textContent = "▸";

        header.appendChild(titleSpan);
        header.appendChild(arrow);

        const body = document.createElement("div");
        body.className = "accordion-body";
        body.id = `push_${tabId}_${index}`;

        const block = document.createElement("div");
        block.className = "subsection";

        const grid = document.createElement("div");
        grid.className = "fields-grid";

        function addInputField(labelText, value, full = false) {
            const field = document.createElement("div");
            field.className = "field";
            if (full) field.classList.add("field-full");

            const label = document.createElement("label");
            label.textContent = labelText;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "readonly";
            input.readOnly = true;
            input.value = value || "";

            field.appendChild(label);
            field.appendChild(input);
            grid.appendChild(field);
        }

        // Metadados compactos no topo do bloco
        const metaParts = [];
        if (p.posicaoJornada) metaParts.push(`posicaoJornada: ${p.posicaoJornada}`);
        if (p.dataInicio) metaParts.push(`dataInicio: ${p.dataInicio}`);
        if (p.ctaType) metaParts.push(`CTA: ${p.ctaType}`);
        if (p.temVar) metaParts.push(`Tem Var: ${p.temVar}`);
        if (p.tipoVar) metaParts.push(`Tipo Var: ${p.tipoVar}`);

        if (metaParts.length > 0) {
            const meta = document.createElement("div");
            meta.className = "meta-row";
            meta.textContent = metaParts.join(" • ");
            block.appendChild(meta);
        }

        if (p.observacao) {
            const obs = document.createElement("div");
            obs.className = "meta-row";
            obs.textContent = `Obs: ${p.observacao}`;
            block.appendChild(obs);
        }

        // Apenas os campos copiáveis
        addInputField("Nome Comunicação", p.nomeCom, true);
        addInputField("Título", p.titulo, true);
        addInputField("Subtítulo", p.subtitulo, true);
        addInputField("URL de Redirecionamento", p.url, true);

        block.appendChild(grid);
        body.appendChild(block);

        item.appendChild(header);
        item.appendChild(body);
        container.appendChild(item);
    });
}

function renderBannerList(tabId, banners) {
    const container = document.getElementById("banner_container_" + tabId);
    if (!container) return;

    container.innerHTML = "";

    if (!banners || banners.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-hint";
        empty.textContent = "Nenhum banner encontrado neste card.";
        container.appendChild(empty);
        return;
    }

    banners.forEach((b, index) => {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("div");
        header.className = "accordion-header accordion-header-small";
        header.dataset.accordionTarget = `banner_${tabId}_${index}`;

        const titleSpan = document.createElement("span");
        titleSpan.className = "accordion-title";
        const num = b.numero || (index + 1);
        titleSpan.textContent = `Banner ${num}`;

        const arrow = document.createElement("span");
        arrow.className = "accordion-arrow";
        arrow.textContent = "▸";

        header.appendChild(titleSpan);
        header.appendChild(arrow);

        const body = document.createElement("div");
        body.className = "accordion-body";
        body.id = `banner_${tabId}_${index}`;

        const block = document.createElement("div");
        block.className = "subsection";

        const grid = document.createElement("div");
        grid.className = "fields-grid";

        function addInputField(labelText, value, full = false) {
            const field = document.createElement("div");
            field.className = "field";
            if (full) field.classList.add("field-full");

            const label = document.createElement("label");
            label.textContent = labelText;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "readonly";
            input.readOnly = true;
            input.value = value || "";

            field.appendChild(label);
            field.appendChild(input);
            grid.appendChild(field);
        }

        function addCodeField(labelText, value) {
            const field = document.createElement("div");
            field.className = "field field-full";

            const label = document.createElement("label");
            label.textContent = labelText;

            const pre = document.createElement("pre");
            pre.className = "code-block";
            pre.textContent = value || "";

            field.appendChild(label);
            field.appendChild(pre);
            grid.appendChild(field);
        }

        // Metadados compactos no topo
        const meta1 = [];
        if (b.tipoExibicao) meta1.push(`tipoExibicao: ${b.tipoExibicao}`);
        if (b.dataInicio) meta1.push(`dataInicio: ${b.dataInicio}`);
        if (b.dataFim) meta1.push(`dataFim: ${b.dataFim}`);
        if (b.periodoExibicao) meta1.push(`periodoExibicao: ${b.periodoExibicao}`);
        if (b.tela) meta1.push(`Tela: ${b.tela}`);

        if (meta1.length > 0) {
            const meta = document.createElement("div");
            meta.className = "meta-row";
            meta.textContent = meta1.join(" • ");
            block.appendChild(meta);
        }

        const meta2 = [];
        if (b.titulo) meta2.push(`Título: ${b.titulo}`);
        if (b.subtitulo) meta2.push(`Subtítulo: ${b.subtitulo}`);
        if (b.cta) meta2.push(`CTA: ${b.cta}`);

        if (meta2.length > 0) {
            const meta = document.createElement("div");
            meta.className = "meta-row";
            meta.textContent = meta2.join(" • ");
            block.appendChild(meta);
        }

        if (b.observacao) {
            const obs = document.createElement("div");
            obs.className = "meta-row";
            obs.textContent = `Obs: ${b.observacao}`;
            block.appendChild(obs);
        }

        // Campos copiáveis
        addInputField("Nome Experiência", b.nomeExp, true);
        addInputField("Channel", b.channel, false);
        addInputField("ContentZone/CampaignPosition", b.contentZone, true);
        addInputField("Template", b.template, false);
        addInputField("ComponentStyle", b.componentStyle, false);
        addInputField("URL de Redirecionamento", b.url, true);
        addInputField("Imagem", b.imagem, true);

        if (b.json) {
            addCodeField("JSON gerado", b.json);
        }

        block.appendChild(grid);
        body.appendChild(block);

        item.appendChild(header);
        item.appendChild(body);
        container.appendChild(item);
    });
}

function renderMktScreenView(tabId, mkt) {
    const container = document.getElementById("mkt_container_" + tabId);
    if (!container) return;

    container.innerHTML = "";

    if (!mkt) {
        const empty = document.createElement("div");
        empty.className = "empty-hint";
        empty.textContent = "Nenhuma MktScreen encontrada neste card.";
        container.appendChild(empty);
        return;
    }

    // Info geral da MktScreen (macro)
    const geral = document.createElement("div");
    geral.className = "subsection";

    const grid = document.createElement("div");
    grid.className = "fields-grid";

    function addInputField(labelText, value, full = false) {
        const field = document.createElement("div");
        field.className = "field";
        if (full) field.classList.add("field-full");

        const label = document.createElement("label");
        label.textContent = labelText;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "readonly";
        input.readOnly = true;
        input.value = value || "";

        field.appendChild(label);
        field.appendChild(input);
        grid.appendChild(field);
    }

    const macroNomeExp =
        mkt.nomeExpMacro ||
        (mkt.blocos && mkt.blocos.length > 0 ? mkt.blocos[0].nomeExp : "");

    // Metadado topo (posição da jornada)
    const metaTop = document.createElement("div");
    metaTop.className = "meta-row";
    const partsTop = [];
    if (mkt.posicaoJornada || mkt.posicaoHeader) {
        partsTop.push(
            `posicaoJornada: ${mkt.posicaoJornada || mkt.posicaoHeader}`
        );
    }
    metaTop.textContent = partsTop.join(" • ");
    if (partsTop.length > 0) {
        geral.appendChild(metaTop);
    }

    // Inputs macro: Nome Experiência + URL (copiáveis)
    addInputField("Nome Experiência", macroNomeExp, true);
    addInputField("URL MktScreen", mkt.url || "", true);

    geral.appendChild(grid);

    const meta2 = document.createElement("div");
    meta2.className = "meta-row";
    meta2.textContent =
        `Blocos (informado no card): ${mkt.blocosQtd || "-"} • ` +
        `Blocos (encontrados): ${mkt.blocos ? String(mkt.blocos.length) : "0"}`;
    geral.appendChild(meta2);

    container.appendChild(geral);

    // Blocos individuais como accordions internos
    if (mkt.blocos && mkt.blocos.length > 0) {
        mkt.blocos.forEach((b, index) => {
            const item = document.createElement("div");
            item.className = "accordion-item";

            const header = document.createElement("div");
            header.className = "accordion-header accordion-header-small";
            header.dataset.accordionTarget = `mkt_${tabId}_${index}`;

            const t = document.createElement("span");
            t.className = "accordion-title";
            t.textContent = `Bloco ${b.numero || (index + 1)}`;

            const arrow = document.createElement("span");
            arrow.className = "accordion-arrow";
            arrow.textContent = "▸";

            header.appendChild(t);
            header.appendChild(arrow);

            const body = document.createElement("div");
            body.className = "accordion-body";
            body.id = `mkt_${tabId}_${index}`;

            const block = document.createElement("div");
            block.className = "subsection";

            const gridBloco = document.createElement("div");
            gridBloco.className = "fields-grid";

            function addInputFieldBloco(labelText, value, full = false) {
                const field = document.createElement("div");
                field.className = "field";
                if (full) field.classList.add("field-full");

                const label = document.createElement("label");
                label.textContent = labelText;

                const input = document.createElement("input");
                input.type = "text";
                input.className = "readonly";
                input.readOnly = true;
                input.value = value || "";

                field.appendChild(label);
                field.appendChild(input);
                gridBloco.appendChild(field);
            }

            function addCodeFieldBloco(labelText, value) {
                const field = document.createElement("div");
                field.className = "field field-full";

                const label = document.createElement("label");
                label.textContent = labelText;

                const pre = document.createElement("pre");
                pre.className = "code-block";
                pre.textContent = value || "";

                field.appendChild(label);
                field.appendChild(pre);
                gridBloco.appendChild(field);
            }

            // Apenas Nome Experiência + JSON do bloco
            addInputFieldBloco("Nome Experiência", b.nomeExp, true);
            addCodeFieldBloco("JSON do bloco", b.json);

            block.appendChild(gridBloco);
            body.appendChild(block);

            item.appendChild(header);
            item.appendChild(body);
            container.appendChild(item);
        });
    }
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

    content.innerHTML = `
        <h2>Entrada do Card</h2>
        <div class="field field-full">
            <textarea class="card-input"
        rows="1"
        oninput="processCard('${tabId}', this.value)"
        onpaste="handlePaste(event)">${data.input || ""}</textarea>
        </div>

        <h2>Título do Card</h2>
        <div class="fields-grid">
            <div class="field">
                <label>Nome do Card / Jornada</label>
                <input id="nome_${tabId}" class="readonly" type="text" readonly value="${data.nome || ""}">
            </div>

            <div class="field">
                <label>Base</label>
                <input id="base_${tabId}" class="readonly" type="text" readonly value="${data.base || ""}">
            </div>
        </div>

        <div class="info-group">
            <div class="info-row">
                <span class="info-label">Descrição do Card:</span>
                <span id="desc_${tabId}" class="info-value">${data.descricao || ""}</span>
                <span class="info-label" style="margin-left:12px;">SOLICITANTE:</span>
                <span id="solicitanteText_${tabId}" class="info-value">${data.solicitante || ""}</span>
            </div>
            <div class="info-row">
                <span class="info-label">DESCRICAO CAMPANHA:</span>
                <span id="descCamp_${tabId}" class="info-value">${data.descCamp || ""}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Observação:</span>
                <span id="obsText_${tabId}" class="info-value">${data.observacao || ""}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Canais:</span>
                <span id="canaisText_${tabId}" class="info-value"></span>
            </div>
        </div>

        <!-- Push pai -->
        <div class="accordion">
            <div class="accordion-header" data-accordion-target="pushWrap_${tabId}">
                <span class="accordion-title">Push</span>
                <span class="accordion-arrow">▸</span>
            </div>
            <div id="pushWrap_${tabId}" class="accordion-body">
                <div id="push_container_${tabId}"></div>
            </div>
        </div>

        <!-- Banner pai -->
        <div class="accordion">
            <div class="accordion-header" data-accordion-target="bannerWrap_${tabId}">
                <span class="accordion-title">Banners</span>
                <span class="accordion-arrow">▸</span>
            </div>
            <div id="bannerWrap_${tabId}" class="accordion-body">
                <div id="banner_container_${tabId}"></div>
            </div>
        </div>

        <!-- MktScreen pai -->
        <div class="accordion">
            <div class="accordion-header" data-accordion-target="mktWrap_${tabId}">
                <span class="accordion-title">MktScreen</span>
                <span class="accordion-arrow">▸</span>
            </div>
            <div id="mktWrap_${tabId}" class="accordion-body">
                <div id="mkt_container_${tabId}"></div>
            </div>
        </div>
    `;

    document.getElementById("content-container").appendChild(content);

    if (data.canais) {
        renderCanais(tabId, data.canais);
    }

    renderPushList(tabId, data.pushes || []);
    renderBannerList(tabId, data.banners || []);
    renderMktScreenView(tabId, data.mktScreen || null);

    autoResizeTextareas(tabId);

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
        pushes: [],
        banners: [],
        mktScreen: null
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

    autoResizeTextareas(tabId);
    saveState();
}

// ===================== PROCESSAMENTO DO CARD =====================

function processCard(tabId, texto) {
    texto = texto || "";
    const linhas = texto.split(/\r?\n/);

    const titulo = parseTitulo(linhas);
    const info = parseInformacoesGerais(linhas);
    const dados = parseDados(linhas);
    const comm = parseCommunications(linhas);

    const pushes = comm.pushes;
    const banners = comm.banners;
    const mkt = comm.mktScreen;

    // Título do card (inputs copiáveis)
    setFieldValue("nome_", tabId, titulo.nome);
    setFieldValue("base_", tabId, dados.base);

    const tabTitle = document.querySelector(`#${tabId} .tab-title`);
    if (tabTitle) {
        tabTitle.textContent = titulo.nome || "Card";
    }

    // Informações gerais (textos fora de readonly)
    setTextValue("desc_" + tabId, titulo.descricao);
    setTextValue("solicitanteText_" + tabId, info.solicitante);
    setTextValue("descCamp_" + tabId, info.descCamp);
    setTextValue("obsText_" + tabId, dados.observacao);

    renderCanais(tabId, info.canais);
    // tempo existe, mas não exibimos (fica só no estado)

    // Push / Banner / Mkt
    renderPushList(tabId, pushes);
    renderBannerList(tabId, banners);
    renderMktScreenView(tabId, mkt);

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

    tabData.pushes      = pushes;
    tabData.banners     = banners;
    tabData.mktScreen   = mkt;

    autoResizeTextareas(tabId);
    saveState();
}

function handlePaste(event) {
    const ta = event.target;

    // deixa o colar acontecer primeiro, depois ajusta
    setTimeout(() => {
        // força scroll pro topo
        ta.scrollTop = 0;

        // joga o cursor pro começo do texto
        ta.selectionStart = 0;
        ta.selectionEnd = 0;
    }, 0);
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

// ===================== ACCORDION HANDLER GLOBAL =====================

document.addEventListener("click", (e) => {
    const header = e.target.closest(".accordion-header");
    if (!header) return;

    const targetId = header.dataset.accordionTarget;
    if (!targetId) return;

    const body = document.getElementById(targetId);
    if (!body) return;

    const isOpen = body.classList.toggle("open");
    header.classList.toggle("open", isOpen);
});

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
