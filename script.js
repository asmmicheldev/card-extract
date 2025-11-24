// ===================== ESTADO / STORAGE =====================

// ==== CONFIG OCR ====
const OCR_API_KEY = "K81669629288957"; // troque pela sua key real

// ===================== ESTADO / STORAGE =====================
let tabsState = {
    tabs: {},
    activeTab: null,
    ocrCache: {}    // cache de OCR por URL de imagem
};

let tabCount = 0;


function saveState() {
    localStorage.setItem("cardExtractData", JSON.stringify(tabsState));
}

function loadState() {
    const saved = localStorage.getItem("cardExtractData");
    if (saved) {
        tabsState = JSON.parse(saved);

        const ids = Object.keys(tabsState.tabs || {})
            .map(id => parseInt(id.replace("tab_", "")))
            .filter(n => !isNaN(n));

        tabCount = ids.length > 0 ? Math.max(...ids) : 0;

        // garante que ocrCache exista
        if (!tabsState.ocrCache) {
            tabsState.ocrCache = {};
        }
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
    const textareas = content.querySelectorAll(
        "textarea.readonly-multiline, textarea.json-final"
    );
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
            dataInicio = linha.split(":").slice(1).join(":").trim();
        } else if (linha.startsWith("dataFim:")) {
            dataFim = linha.split(":").slice(1).join(":").trim();
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
    let channel = "";
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

                const m = url.match(/[?&]channel=([^&]+)/);
                if (m) {
                    channel = decodeURIComponent(m[1]);
                }
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

        return { posicaoJornada, url, blocosQtd, nomeExpMacro, channel, blocos };
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

// ===================== RENDER DE LISTAS (PUSH) =====================

function renderPushList(tabId, pushes) {
    const container = document.getElementById("push_container_" + tabId);
    if (!container) return;

    // pega o accordion pai (bloco "Push")
    const accordion = container.closest(".accordion");

    container.innerHTML = "";

    // se não tiver push, esconde o accordion e sai
    if (!pushes || pushes.length === 0) {
        if (accordion) accordion.style.display = "none";
        return;
    }

    // se tiver push, garante que o bloco esteja visível
    if (accordion) accordion.style.display = "";

    // ===== a partir daqui é igual ao que você já tinha, só tirei o bloco "Nenhum push encontrado..." =====

    let lastDate = null;

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

        // ===== META (igual antes) =====
        let decoratedDate = "";
        if (p.dataInicio) {
            const current = new Date(p.dataInicio.trim());
            if (!isNaN(current.getTime())) {
                if (!lastDate) {
                    decoratedDate = `${p.dataInicio} (inicial)`;
                } else {
                    const diffMs = current.getTime() - lastDate.getTime();
                    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        decoratedDate = `${p.dataInicio} (wait ${diffDays} dia${diffDays > 1 ? "s" : ""})`;
                    } else {
                        decoratedDate = p.dataInicio;
                    }
                }
                lastDate = current;
            } else {
                decoratedDate = p.dataInicio;
            }
        }

        const hasMeta = decoratedDate || p.ctaType || p.observacao !== undefined;
        if (hasMeta) {
            const metaGroup = document.createElement("div");
            metaGroup.className = "info-group";

            const row = document.createElement("div");
            row.className = "info-row";

            if (decoratedDate) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.textContent = "Data de Início:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = decoratedDate;
                row.appendChild(lbl);
                row.appendChild(val);
            }

            if (p.ctaType) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.style.marginLeft = "12px";
                lbl.textContent = "CTA:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = p.ctaType;
                row.appendChild(lbl);
                row.appendChild(val);
            }

            const obsText = (p.observacao && p.observacao.trim() !== "") ? p.observacao : "N/A";
            const lblObs = document.createElement("span");
            lblObs.className = "info-label";
            lblObs.style.marginLeft = "12px";
            lblObs.textContent = "Obs:";
            const valObs = document.createElement("span");
            valObs.className = "info-value";
            valObs.textContent = obsText;
            row.appendChild(lblObs);
            row.appendChild(valObs);

            metaGroup.appendChild(row);
            block.appendChild(metaGroup);
        }

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

        addInputField("Nome Comunicação", p.nomeCom, true);

        const rowTitulos = document.createElement("div");
        rowTitulos.className = "fields-grid-3";

        function addInputFieldRow(labelText, value) {
            const field = document.createElement("div");
            field.className = "field";

            const label = document.createElement("label");
            label.textContent = labelText;

            const input = document.createElement("input");
            input.type = "text";
            input.className = "readonly";
            input.readOnly = true;
            input.value = value || "";

            field.appendChild(label);
            field.appendChild(input);
            rowTitulos.appendChild(field);
        }

        addInputFieldRow("Título", p.titulo);
        addInputFieldRow("Subtítulo", p.subtitulo);
        addInputFieldRow("URL", p.url);

        block.appendChild(grid);
        block.appendChild(rowTitulos);

        body.appendChild(block);
        item.appendChild(header);
        item.appendChild(body);
        container.appendChild(item);
    });
}



// Usa o OCR.Space para extrair o texto da imagem e preencher o campo de Accessibility Text
async function fetchAccessibilityText(imageUrl, textarea, tabId) {
    if (!textarea) return;

    if (!imageUrl) {
        textarea.value = "";
        return;
    }

    // garante que ocrCache exista
    if (!tabsState.ocrCache) {
        tabsState.ocrCache = {};
    }

    // 1) tenta usar cache
    const cached = tabsState.ocrCache[imageUrl];
    if (cached) {
        textarea.value = cached;
        // dispara o "input" para atualizar JSON Final
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        autoResizeTextareas(tabId);
        return;
    }

    // 2) se não tiver cache, chama API
    textarea.value = "Lendo texto da imagem...";

    try {
        const form = new FormData();
        form.append("apikey", OCR_API_KEY); // usa sua key
        form.append("url", imageUrl);
        form.append("language", "por");

        const res = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: form
        });

        if (!res.ok) {
            textarea.value = "Erro ao chamar OCR (HTTP " + res.status + ").";
            return;
        }

        const data = await res.json();
        console.log("OCR response:", data);

        const txt = data?.ParsedResults?.[0]?.ParsedText?.trim();

        const finalText = txt || "Nenhum texto encontrado.";
        textarea.value = finalText;

        // salva no cache
        tabsState.ocrCache[imageUrl] = finalText;
        saveState();

        // dispara o "input" para atualizar JSON Final (accessibilityText)
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
        console.error("Erro OCR:", e);
        textarea.value = "Erro ao processar imagem.";
    }

    autoResizeTextareas(tabId);
}




    // Formata "2025-11-17T10:00" -> "2025-11-17 T 10:00 (10 AM)"
    function formatBannerDateTime(str) {
        if (!str) return "";
        str = str.trim();

        const parts = str.split("T");
        if (parts.length !== 2) return str;  // se não tiver "T", devolve como veio

        const date = parts[0].trim();
        const timeRaw = parts[1].trim(); // ex: "10:00"

        const [hhStrRaw, mmStrRaw] = timeRaw.split(":");
        const hhStr = (hhStrRaw || "").padStart(2, "0");
        const mmStr = (mmStrRaw ? mmStrRaw.substring(0, 2) : "00").padStart(2, "0");

        const hh = parseInt(hhStr, 10);
        if (isNaN(hh)) {
            return `${date} T ${timeRaw}`;
        }

        const ampm = hh >= 12 ? "PM" : "AM";
        let hour12 = hh % 12;
        if (hour12 === 0) hour12 = 12;

        return `${date} T ${hhStr}:${mmStr} (${hour12} ${ampm})`;
    }


    // Monta a URL da API de QR Code a partir de um deeplink
function buildQrCodeUrl(link) {
    if (!link) return "";
    const encoded = encodeURIComponent(link.trim());
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=300x300`;
}



function renderBannerList(tabId, banners) {
    const container = document.getElementById("banner_container_" + tabId);
    if (!container) return;

    // accordion pai (bloco "Banners")
    const accordion = container.closest(".accordion");

    container.innerHTML = "";

    // se não tiver banners, esconde o bloco inteiro
    if (!banners || banners.length === 0) {
        if (accordion) accordion.style.display = "none";
        return;
    }

    // se tiver banners, garante que o bloco esteja visível
    if (accordion) accordion.style.display = "";

    banners.forEach((b, index) => {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const header = document.createElement("div");
        header.className = "accordion-header accordion-header-small";
        header.dataset.accordionTarget = `banner_${tabId}_${index}`;

        const titleSpan = document.createElement("span");
        titleSpan.className = "accordion-title";
        const num = index + 1; // sempre 1, 2, 3...
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

        // vamos ligar Accessibility Text <-> JSON Final
        let accTextarea = null;
        let jsonFinalArea = null;

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

        // ========== LINHA 1: Datas + Obs ==========
        const infoTop = document.createElement("div");
        infoTop.className = "info-group";

        const rowDates = document.createElement("div");
        rowDates.className = "info-row";

        if (b.dataInicio) {
            const lbl = document.createElement("span");
            lbl.className = "info-label";
            lbl.textContent = "Data de Início:";
            const val = document.createElement("span");
            val.className = "info-value";
            val.textContent = formatBannerDateTime(b.dataInicio);
            rowDates.appendChild(lbl);
            rowDates.appendChild(val);
        }

        if (b.dataFim) {
            const lbl = document.createElement("span");
            lbl.className = "info-label";
            lbl.style.marginLeft = "12px";
            lbl.textContent = "Data de Fim:";
            const val = document.createElement("span");
            val.className = "info-value";
            val.textContent = formatBannerDateTime(b.dataFim);
            rowDates.appendChild(lbl);
            rowDates.appendChild(val);
        }

        const obsText = (b.observacao && b.observacao.trim() !== "") ? b.observacao : "N/A";
        const lblObs = document.createElement("span");
        lblObs.className = "info-label";
        lblObs.style.marginLeft = "12px";
        lblObs.textContent = "Obs:";
        const valObs = document.createElement("span");
        valObs.className = "info-value";
        valObs.textContent = obsText;
        rowDates.appendChild(lblObs);
        rowDates.appendChild(valObs);

        infoTop.appendChild(rowDates);
        block.appendChild(infoTop);

        // ========== LINHA 2: Título / Subtítulo / CTA ==========
        if (b.titulo || b.subtitulo || b.cta) {
            const infoTit = document.createElement("div");
            infoTit.className = "info-group";

            const rowTit = document.createElement("div");
            rowTit.className = "info-row";

            if (b.titulo) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.textContent = "Título:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.titulo;
                rowTit.appendChild(lbl);
                rowTit.appendChild(val);
            }

            if (b.subtitulo) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.style.marginLeft = "12px";
                lbl.textContent = "Subtítulo:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.subtitulo;
                rowTit.appendChild(lbl);
                rowTit.appendChild(val);
            }

            if (b.cta) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.style.marginLeft = "12px";
                lbl.textContent = "CTA:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.cta;
                rowTit.appendChild(lbl);
                rowTit.appendChild(val);
            }

            infoTit.appendChild(rowTit);
            block.appendChild(infoTit);
        }

        // ========== LINHA 3: ContentZone / Template / ComponentStyle ==========
        const hasLayoutMeta = b.contentZone || b.template || b.componentStyle;
        if (hasLayoutMeta) {
            const layoutGroup = document.createElement("div");
            layoutGroup.className = "info-group";

            const rowLayout = document.createElement("div");
            rowLayout.className = "info-row";

            if (b.contentZone) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.textContent = "ContentZone/CampaignPosition:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.contentZone;
                rowLayout.appendChild(lbl);
                rowLayout.appendChild(val);
            }

            if (b.template) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.style.marginLeft = "12px";
                lbl.textContent = "Template:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.template;
                rowLayout.appendChild(lbl);
                rowLayout.appendChild(val);
            }

            if (b.componentStyle) {
                const lbl = document.createElement("span");
                lbl.className = "info-label";
                lbl.style.marginLeft = "12px";
                lbl.textContent = "ComponentStyle:";
                const val = document.createElement("span");
                val.className = "info-value";
                val.textContent = b.componentStyle;
                rowLayout.appendChild(lbl);
                rowLayout.appendChild(val);
            }

            layoutGroup.appendChild(rowLayout);
            block.appendChild(layoutGroup);
        }

        // ========== GRID DE CAMPOS COPIÁVEIS ==========
        addInputField("Nome Experiência", b.nomeExp, true);
        addInputField("Channel", b.channel, false);
        addInputField("Imagem (URL)", b.imagem, true);

        // ---------- Accessibility Text ----------
        const accField = document.createElement("div");
        accField.className = "field field-full";

        const accLabel = document.createElement("label");
        accLabel.textContent = "Accessibility Text";

        const accRow = document.createElement("div");
        accRow.className = "acc-row";

        accTextarea = document.createElement("textarea");
        accTextarea.className = "readonly-multiline";
        accTextarea.rows = 3;
        accTextarea.id = `accText_${tabId}_${index}`;

        if (b.accText) {
            accTextarea.value = b.accText;
        } else if (tabsState.ocrCache && b.imagem && tabsState.ocrCache[b.imagem]) {
            accTextarea.value = tabsState.ocrCache[b.imagem];
            const tabData = tabsState.tabs[tabId];
            if (tabData && tabData.banners && tabData.banners[index]) {
                tabData.banners[index].accText = accTextarea.value;
                saveState();
            }
        }

        accTextarea.addEventListener("input", () => {
            const tabData = tabsState.tabs[tabId];
            const value = accTextarea.value;

            if (tabData && tabData.banners && tabData.banners[index]) {
                tabData.banners[index].accText = value;
            }

            // Atualiza o accessibilityText dentro do JSON Final
            if (jsonFinalArea) {
                try {
                    const obj = JSON.parse(jsonFinalArea.value || "{}");
                    obj.accessibilityText = value || "titulo_da_imageUrl";
                    const updated = JSON.stringify(obj, null, 2);
                    jsonFinalArea.value = updated;

                    if (tabData && tabData.banners && tabData.banners[index]) {
                        tabData.banners[index].jsonFinal = updated;
                        saveState();
                    }
                } catch (e) {
                    // se JSON estiver inválido, ignora
                }
            } else {
                saveState();
            }
        });

        const accBtn = document.createElement("button");
        accBtn.type = "button";
        accBtn.textContent = "Gerar Accessibility Text";
        accBtn.className = "btn-secondary";

        accBtn.addEventListener("click", () => {
            if (!b.imagem) {
                accTextarea.value = "Nenhuma URL de imagem.";
                return;
            }
            fetchAccessibilityText(b.imagem, accTextarea, tabId);
        });

        accRow.appendChild(accTextarea);
        accRow.appendChild(accBtn);
        accField.appendChild(accLabel);
        accField.appendChild(accRow);
        grid.appendChild(accField);

        block.appendChild(grid);

        // ========== PREVIEW DA IMAGEM ==========
        if (b.imagem) {
            const previewBlock = document.createElement("div");
            previewBlock.className = "image-preview-block";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Mostrar imagem";
            btn.className = "btn-secondary";

            const img = document.createElement("img");
            img.src = b.imagem;
            img.alt = "";
            img.style.display = "none";
            img.style.maxWidth = "100%";
            img.style.marginTop = "8px";
            img.loading = "lazy";

            btn.addEventListener("click", () => {
                const visible = img.style.display === "block";
                img.style.display = visible ? "none" : "block";
                btn.textContent = visible ? "Mostrar imagem" : "Ocultar imagem";
            });

            previewBlock.appendChild(btn);
            previewBlock.appendChild(img);
            block.appendChild(previewBlock);
        }

        // ========== JSON GERADO + OFFER ID + JSON FINAL ==========
        if (b.json) {
            // JSON gerado (original)
            const jsonField = document.createElement("div");
            jsonField.className = "field field-full";

            const details = document.createElement("details");
            details.className = "json-original-toggle";

            const summary = document.createElement("summary");
            summary.textContent = "JSON gerado (original)";

            const pre = document.createElement("pre");
            pre.className = "code-block";
            pre.textContent = b.json || "";

            details.appendChild(summary);
            details.appendChild(pre);
            jsonField.appendChild(details);

            // JSON Final
            const jsonFinalField = document.createElement("div");
            jsonFinalField.className = "field field-full";

            const jsonFinalLabel = document.createElement("label");
            jsonFinalLabel.textContent = "JSON Final";

            jsonFinalArea = document.createElement("textarea");
            jsonFinalArea.className = "json-final";
            jsonFinalArea.style.width = "100%";
            jsonFinalArea.style.minHeight = "220px";
            jsonFinalArea.style.fontFamily = "monospace";
            jsonFinalArea.rows = 10;
            jsonFinalArea.spellcheck = false;

            let defaultFinalObj = null;
            let defaultFinalJson = "";
            try {
                const obj = JSON.parse(b.json);

                // se for fullscreen, troca título por placeholder
                if (typeof obj.campaignTitle === "string" &&
                    obj.campaignTitle.toLowerCase().includes("fullscreen")) {
                    obj.campaignTitle = "numero_do_offerID";
                }

                obj.campaignSubtitle = "";
                obj.messageButton   = "";

                if (b.contentZone) {
                    obj.campaignPosition = b.contentZone;
                }

                // coloca accessibilityText com o valor atual (ou placeholder)
                const initialAcc = b.accText && b.accText.trim() !== ""
                    ? b.accText
                    : "titulo_da_imageUrl";
                obj.accessibilityText = initialAcc;

                defaultFinalObj = obj;
                defaultFinalJson = JSON.stringify(obj, null, 2);
            } catch (e) {
                defaultFinalJson = b.json;
            }

            const tabData = tabsState.tabs[tabId];
            let stored = null;
            let offerId = "";

            if (tabData && tabData.banners && tabData.banners[index]) {
                stored  = tabData.banners[index].jsonFinal || null;
                offerId = tabData.banners[index].offerId   || "";
            }

            // se já existir offerId salvo e ainda não houver jsonFinal salvo,
            // aplica o número direto no campaignTitle
            if (!stored && offerId && defaultFinalObj) {
                defaultFinalObj.campaignTitle = offerId;
                defaultFinalJson = JSON.stringify(defaultFinalObj, null, 2);
            }

            jsonFinalArea.value = stored || defaultFinalJson;

            // primeira vez: persiste o JSON Final calculado
            if (tabData && tabData.banners && tabData.banners[index] && !tabData.banners[index].jsonFinal) {
                tabData.banners[index].jsonFinal = jsonFinalArea.value;
                saveState();
            }

            // se você editar o JSON Final na mão, continua salvando normalmente
            jsonFinalArea.addEventListener("input", () => {
                const tData = tabsState.tabs[tabId];
                if (tData && tData.banners && tData.banners[index]) {
                    tData.banners[index].jsonFinal = jsonFinalArea.value;
                    saveState();
                }
            });

            jsonFinalField.appendChild(jsonFinalLabel);
            jsonFinalField.appendChild(jsonFinalArea);

            // Campo Número do Offer ID (antes do JSON Final), no estilo do Accessibility Text
            const offerField = document.createElement("div");
            offerField.className = "field field-full";

            const offerLabel = document.createElement("label");
            offerLabel.textContent = "Número do Offer ID";

            // linha estilo acc-row (mesmo layout do Accessibility Text)
            const offerRow = document.createElement("div");
            offerRow.className = "acc-row";

            const offerInput = document.createElement("input");
            offerInput.type = "text";
            offerInput.className = "input";   // usa o mesmo estilo dos outros inputs
            offerInput.value = offerId || "";

            offerInput.addEventListener("input", () => {
                const value = offerInput.value.trim();
                const tData = tabsState.tabs[tabId];
                if (tData && tData.banners && tData.banners[index]) {
                    tData.banners[index].offerId = value;
                }

                // Atualiza campaignTitle dentro do JSON Final
                try {
                    const obj = JSON.parse(jsonFinalArea.value || "{}");

                    if (value) {
                        // quando tiver ID: campaignTitle = ID
                        obj.campaignTitle = value;
                    } else {
                        // se apagar o ID: volta pro placeholder
                        obj.campaignTitle = "numero_do_offerID";
                    }

                    const updated = JSON.stringify(obj, null, 2);
                    jsonFinalArea.value = updated;

                    if (tData && tData.banners && tData.banners[index]) {
                        tData.banners[index].jsonFinal = updated;
                        saveState();
                    }
                } catch (e) {
                    // se o JSON estiver inválido, não mexe
                }
            });

            offerRow.appendChild(offerInput);
            offerField.appendChild(offerLabel);
            offerField.appendChild(offerRow);

            // Ordem: JSON original -> Número do Offer ID -> JSON Final
            block.appendChild(jsonField);
            block.appendChild(offerField);
            block.appendChild(jsonFinalField);
        }

        body.appendChild(block);
        item.appendChild(header);
        item.appendChild(body);
        container.appendChild(item);
    });
}


function renderMktScreenView(tabId, mkt) {
    const container = document.getElementById("mkt_container_" + tabId);
    if (!container) return;

    const accordion = container.closest(".accordion");

    container.innerHTML = "";

    // se não tiver mktScreen, esconde o bloco
    if (!mkt) {
        if (accordion) accordion.style.display = "none";
        return;
    }

    // garante que o bloco "Marketing Screen" apareça
    if (accordion) accordion.style.display = "";

    // ===== BLOCO GERAL (Channel + URL + QR) =====
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

    addInputField("Channel", mkt.channel || "", true);
    addInputField("URL Marketing Screen", mkt.url || "", true);

    geral.appendChild(grid);

    // ===== BLOCO "Mostrar QR Code" =====
    const qrBlock = document.createElement("div");
    qrBlock.className = "image-preview-block";

    const qrBtn = document.createElement("button");
    qrBtn.type = "button";
    qrBtn.textContent = "Mostrar QR Code";
    qrBtn.className = "btn-secondary";

    const qrImg = document.createElement("img");
    qrImg.style.display = "none";
    qrImg.style.maxWidth = "260px";
    qrImg.style.marginTop = "8px";
    qrImg.loading = "lazy";

    qrBtn.addEventListener("click", () => {
        const visible = qrImg.style.display === "block";

        if (!visible) {
            const link = (mkt.url || "").trim();
            if (!link) {
                alert("URL Marketing Screen vazia. Copie/cole o deeplink no card primeiro.");
                return;
            }

            // só define o src UMA vez, na primeira abertura
            if (!qrImg.src) {
                qrImg.src = buildQrCodeUrl(link);
            }
        }

        qrImg.style.display = visible ? "none" : "block";
        qrBtn.textContent = visible ? "Mostrar QR Code" : "Ocultar QR Code";
    });

    qrBlock.appendChild(qrBtn);
    qrBlock.appendChild(qrImg);
    geral.appendChild(qrBlock);

    container.appendChild(geral);

    // ===== BLOCOS DA MKTSCREEN (já existiam) =====
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
        <h2>Card Input</h2>
        <div class="field field-full">
            <textarea class="card-input"
                    rows="1"
                    oninput="processCard('${tabId}', this.value)"
                    onpaste="handlePaste(event)">${data.input || ""}</textarea>
        </div>

        <h2>Informações Gerais</h2>

        <div class="info-group">
            <div class="info-row">
                <span class="info-label">Canais:</span>
                <span id="canaisText_${tabId}" class="info-value"></span>

                <span class="info-label" style="margin-left:12px;">SOLICITANTE:</span>
                <span id="solicitanteText_${tabId}" class="info-value">${data.solicitante || ""}</span>

                <span class="info-label" style="margin-left:12px;">Observação:</span>
                <span id="obsText_${tabId}" class="info-value">${data.observacao || ""}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Descrição do Card:</span>
                <span id="desc_${tabId}" class="info-value">${data.descricao || ""}</span>

                <span class="info-label" style="margin-left:12px;">DESCRICAO CAMPANHA:</span>
                <span id="descCamp_${tabId}" class="info-value">${data.descCamp || ""}</span>
            </div>
        </div>

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
                <span class="accordion-title">Marketing Screen</span>
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
    const info   = parseInformacoesGerais(linhas);
    const dados  = parseDados(linhas);
    const comm   = parseCommunications(linhas);

    const pushes  = comm.pushes;
    const banners = comm.banners;
    const mkt     = comm.mktScreen;

    // pega estado atual da aba (se existir)
    const tabData = tabsState.tabs[tabId] || {};

    const oldBanners = tabData.banners || [];
    const mergedBanners = banners.map((b, idx) => {
        const old = oldBanners[idx] || {};
        return {
            ...b,
            accText:   old.accText   || "",
            jsonFinal: old.jsonFinal || "",
            offerId:   old.offerId   || ""
        };
    });

    // ===== ATUALIZA CAMPOS DE TELA =====
    setFieldValue("nome_", tabId, titulo.nome);
    setFieldValue("base_", tabId, dados.base);

    const tabTitle = document.querySelector(`#${tabId} .tab-title`);
    if (tabTitle) {
        tabTitle.textContent = titulo.nome || "Card";
    }

    setTextValue("desc_" + tabId, titulo.descricao);
    setTextValue("solicitanteText_" + tabId, info.solicitante);
    setTextValue("descCamp_" + tabId, info.descCamp);
    setTextValue("obsText_" + tabId, dados.observacao);

    renderCanais(tabId, info.canais);

    // ===== ATUALIZA ESTADO =====
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
    tabData.banners     = mergedBanners;
    tabData.mktScreen   = mkt;

    tabsState.tabs[tabId] = tabData;

    // ===== RENDER COM DADOS MESCLADOS =====
    renderPushList(tabId, pushes);
    renderBannerList(tabId, mergedBanners);
    renderMktScreenView(tabId, mkt);

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
