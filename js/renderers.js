// js/renderers.js
import { tabsState, saveState } from "./state.js";

const DEMANDANTE_HASHS = {
  "paulo.alberto@xpi.com.br":
    "b743c8c34edcfa116ce1f17a9bd53b1692753051ada96db8dae03ea2bc71793a",
  "gustavo.aalmeida@xpi.com.br":
    "17c0ed511acdc822480032cb42db40e311dcd76ecf5969d4984ff24482caf296",
  "anna.livia@xpi.com.br":
    "f21112bc542043ef511a444c5c1934032587379a2116a0e412601dcaf6a2911d"
};

function getHashForSolicitante(email) {
  if (!email) return "";
  const key = email.trim().toLowerCase();
  return DEMANDANTE_HASHS[key] || "";
}

/* ====================================================================== */
/* ============================ QA CHECKLIST ============================ */
/* ====================================================================== */

const QA_CHECKLIST = [
  {
    key: "ajoCampaign",
    title: "AJO Campaign",
    items: [
      { id: "ajo_01", text: "Campanha criada no campaign?" },
      { id: "ajo_02", text: "Nome da campanha de acordo com o card? (Nome do card)" },
      { id: "ajo_03", text: "Nome da ação de acordo com o card? (Nome do touch)" },
      { id: "ajo_04", text: "Tagueamento das peças está dentro do modelo padrão (verificar se a central faz sentido)?" },
      { id: "ajo_05", text: "Print do card está de acordo com a configuração da comunicação?" },
      { id: "ajo_06", text: "Verificar se o email possui header e footer da mesma marca" },
      { id: "ajo_07", text: "Avaliar se o assunto/pré header e sender estão de acordo com o card e configurados" },
      {
        id: "ajo_08",
        text: "Peças estão reiderizando corretamente as variáveis? (Print da pessoa que desenvolveu)",
        defaultObs: "Anexar print.",
        obsLocked: true
      },
      { id: "ajo_09", text: "Verificar links nas comunicações (Ex: Onelink pra deeplink em e-mail etc)" },
      { id: "ajo_10", text: "Configurações da atividade de push estão corretas, link configurado na peça (IOS + Android) e marca selecionada (push configuration)?" },
      { id: "ajo_11", text: "Avaliar se a audiencia possui opt out para o canal que será disparado (Ofertas, relacionamento, novidades)" },
      { id: "ajo_12", text: "Print da evidencia está em anexo?" },
      { id: "ajo_13", text: "Card possui ok de testes?" }
    ]
  },
  {
    key: "offers",
    title: "Offers (Banners/Inapps)",
    items: [
      { id: "off_01", text: "Nome da campanha de acordo com o card? (Nome do touch)" },
      { id: "off_02", text: "Data configurada conforme solicitado no card?" },
      { id: "off_03", text: "Marca selecionada de acordo com o card?" },
      { id: "off_04", text: "Posicionamento configurado de acordo com o card?" },
      { id: "off_05", text: "Avaliar no Json se a imagem está reiderizando corretamente e se copy/deeplink estão condizentes com o card" },
      { id: "off_06", text: "Avaliar se a audiencia está inclusa corretamente (Audiencia Full - sem opt out de canais)" },
      { id: "off_07", text: "Prioridade configurada de acordo com o de/para do planner? (Figura 1)" },
      { id: "off_08", text: "Segmento com regra de 20 viasualizações e 3 cliques?" }
    ]
  },
  {
    key: "mkt",
    title: "Marketing Screen",
    items: [
      { id: "mkt_01", text: "Nome da campanha de acordo com o card? (Nome da ação)" },
      { id: "mkt_02", text: "Avaliar se o publico-alvo está configurado e setado na experiencia" },
      { id: "mkt_03", text: "Avaliar se a localização da MS está de acordo com o solicitado no card" },
      { id: "mkt_04", text: "Avaliar se o nome da experiencia está incluso no json (nome de acordo com o card)" },
      { id: "mkt_05", text: "Avaliar no Json se a imagem está reiderizando corretamente e se copy/deeplink estão condizentes com o card" },
      { id: "mkt_06", text: "Avaliar se a prioridade está como '1'" },
      { id: "mkt_07", text: "Avaliar se a 'Meta' está configurada com 'envolvimento' e 'visualizações de pagina'." },
      { id: "mkt_08", text: "Avaliar se a MS está ativa" }
    ]
  },
  {
    key: "aud",
    title: "Audiences Adobe (AEP)",
    items: [
      { id: "aud_01", text: "Validar se existe a exclusao de MA General Exclusion" },
      { id: "aud_02", text: "Em casos de nao ter general exclusion, validar se incluímos GC" },
      { id: "aud_03", text: "Validar Sinacor ativo (True)" },
      { id: "aud_04", text: "Validar Trading Account Hash (Exists)" },
      { id: "aud_05", text: "Validar Optout B2B (Apenas XP - Excluir) - Campanhas" },
      { id: "aud_06", text: "Avaliar a marca" },
      { id: "aud_07", text: "Audience publicada?" },
      { id: "aud_08", text: "Audience está na pasta correta?" },
      { id: "aud_09", text: "Tags foram adicionadas?" },
      { id: "aud_10", text: "Audience no padrão de nomenclatura?" },
      { id: "aud_11", text: "Verificar se a lógica construida faz sentido com o briefing de negócios" },
      { id: "aud_12", text: "Avaliar se a audiencia foi configurada da forma correta (Batch ou Streaming)" },
      { id: "aud_13", text: "Validar volumetria e Valuation da Audience" },
      { id: "aud_14", text: "Validar se existe opt-out do canal e se condiz com a central de envio (Casos de Campagn)" }
    ]
  },
  {
    key: "journey",
    title: "Journey (AJO)",
    items: [
      { id: "jrn_01", text: "Verificar evidências de testes de disparo(s)" },
      { id: "jrn_02", text: "Verificar aprovação do time de negócios" },
      { id: "jrn_03", text: "Garantir que as audiencias, critérios de entrada e regras estão condizentes com as regras de negócio" },
      { id: "jrn_04", text: "Avaliar se a audiencia selecionada condiz com o disparo (Read ou qualification)" },
      { id: "jrn_05", text: "Read Audience: Verificar o Schedule da Jornada" },
      { id: "jrn_06", text: "Avaliar as regras de reingresso ou tempo de descanso" },
      { id: "jrn_07", text: "Unitary Event: Existe a atividade de Espera de pelo menos 10 minutos logo após a atividade de entrada?" },
      { id: "jrn_08", text: "Unitary Event: Existe um condition logo após o evento de wait que faz a validação na Audience e filtra apenas os clientes que estão na audience" },
      { id: "jrn_09", text: "Unitary Event: Verificar se a condição para trigger via evento está correta de acordo com o objetivo da jornada/campanha e briefing" },
      { id: "jrn_10", text: "Garantir que as configurações da jornada estão de acordo com o briefing: touchpoints, conditions, data e horário do disparo e etc." },
      { id: "jrn_11", text: "Checar a seleção de sender/surface para canais" },
      { id: "jrn_12", text: "Validar se a jornada possui conditions (ProfileFielGroup)" },
      { id: "jrn_13", text: "Validar se a jornada possui conditions de opt-out (ProfileFielGroup)" },
      { id: "jrn_14", text: "[E-MAIL] Conferir templates, conteúdos e personalização de variáveis nas actions" },
      { id: "jrn_15", text: "[PUSH] Conferir templates, conteúdos e personalização de variáveis nas actions" },
      { id: "jrn_16", text: "Verificar se taxonomia (jornada/campanha e steps/actions) segue o padrão definido" },
      { id: "jrn_17", text: "[WhatsApp] Conferir templates, conteúdos e personalização de variáveis nas actions" },
      { id: "jrn_18", text: "[WhatsApp] Avaliar tamanho da base para nao enviarmos mais de 1.000 disparos por minuto", defaultObs: "Confirmar quantidade com time do Avila" }
    ]
  }
];

function ensureQA(tabData) {
  if (!tabData.qa) tabData.qa = { items: {} };
  if (!tabData.qa.items) tabData.qa.items = {};
}

function getQAEntry(tabData, id) {
  ensureQA(tabData);
  return tabData.qa.items[id] || { status: null, obs: "" };
}

function setQAEntry(tabId, id, patch) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;
  ensureQA(tabData);

  const prev = tabData.qa.items[id] || { status: null, obs: "" };
  tabData.qa.items[id] = { ...prev, ...patch };

  tabsState.tabs[tabId] = tabData;
  saveState();
}

function applyTriStateToggleVisual(group, status) {
  const noBtn = group.querySelector(".toggle-chip.no");
  const yesBtn = group.querySelector(".toggle-chip.yes");
  if (!noBtn || !yesBtn) return;

  noBtn.classList.remove("active");
  yesBtn.classList.remove("active");

  if (status === true) yesBtn.classList.add("active");
  if (status === false) noBtn.classList.add("active");
}

function computeStats(tabData, items) {
  let yes = 0, no = 0, pend = 0;
  items.forEach(it => {
    const st = getQAEntry(tabData, it.id).status;
    if (st === true) yes++;
    else if (st === false) no++;
    else pend++;
  });
  return { yes, no, pend, total: items.length };
}

function buildQAText(tabData) {
  ensureQA(tabData);

  let yesAll = 0, noAll = 0, pendAll = 0;

  QA_CHECKLIST.forEach(sec => {
    const st = computeStats(tabData, sec.items);
    yesAll += st.yes; noAll += st.no; pendAll += st.pend;
  });

  const lines = [];
  lines.push("~QA - Checks");
  lines.push(`Resumo: Sim ${yesAll} | Não ${noAll} | Pendente ${pendAll}`);
  lines.push("");

  QA_CHECKLIST.forEach(sec => {
    const secLines = [];

    sec.items.forEach(it => {
      const entry = getQAEntry(tabData, it.id);
      if (entry.status !== true) return;

      const obsText = (entry.obs && entry.obs.trim())
        ? entry.obs.trim()
        : (it.defaultObs ? it.defaultObs.trim() : "");

      let row = `- ${it.text} — Sim`;
      if (obsText) row += ` | Obs: ${obsText}`;
      secLines.push(row);
    });

    if (secLines.length) {
      if (lines[lines.length - 1] !== "") lines.push("");
      lines.push(sec.title);
      lines.push(...secLines);
    }
  });

  return lines.join("\n").trim();
}

function updateQAOutput(tabId, tabData) {
  const out = document.getElementById("qaOutput_" + tabId);
  if (!out) return;
  out.value = buildQAText(tabData);
}

export function renderQAChecks(tabId, tabData, openIds = []) {
  const container = document.getElementById("qa_container_" + tabId);
  if (!container) return;

  ensureQA(tabData);
  container.innerHTML = "";

  const getOpenIdsNow = () =>
    Array.from(container.querySelectorAll(".accordion-body.open")).map(b => b.id);

  QA_CHECKLIST.forEach(sec => {
    const stats = computeStats(tabData, sec.items);

    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier3";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `qa_${tabId}_${sec.key}`;

    const title = document.createElement("span");
    title.className = "accordion-title";
    title.textContent = sec.title;

    const meta = document.createElement("span");
    meta.className = "accordion-meta";
    meta.textContent = `Sim ${stats.yes}/${stats.total}`;

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▸";

    header.appendChild(title);
    header.appendChild(meta);
    header.appendChild(arrow);

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.id = `qa_${tabId}_${sec.key}`;

    if (openIds.includes(body.id)) {
      body.classList.add("open");
      header.classList.add("open");
    }

    const block = document.createElement("div");
    block.className = "subsection";

    sec.items.forEach(it => {
      const row = document.createElement("div");
      row.className = "qa-item-row";

      const txt = document.createElement("div");
      txt.className = "qa-item-text";
      txt.textContent = it.text;

      const group = document.createElement("div");
      group.className = "toggle-group";
      group.dataset.qaId = it.id;

      const noBtn = document.createElement("button");
      noBtn.type = "button";
      noBtn.className = "toggle-chip no";
      noBtn.textContent = "Não";

      const yesBtn = document.createElement("button");
      yesBtn.type = "button";
      yesBtn.className = "toggle-chip yes";
      yesBtn.textContent = "Sim";

      group.appendChild(noBtn);
      group.appendChild(yesBtn);

      const obs = document.createElement("input");
      obs.type = "text";
      obs.className = it.obsLocked ? "readonly qa-obs-input" : "input qa-obs-input";
      obs.readOnly = !!it.obsLocked;

      const entry = getQAEntry(tabData, it.id);

      if ((!entry.obs || !entry.obs.trim()) && it.defaultObs) {
        entry.obs = it.defaultObs;
        setQAEntry(tabId, it.id, { obs: it.defaultObs });
      }

      obs.value = entry.obs || "";
      applyTriStateToggleVisual(group, entry.status);

      noBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const keepOpen = getOpenIdsNow();

        const cur = getQAEntry(tabData, it.id).status;
        const next = (cur === false) ? null : false;
        setQAEntry(tabId, it.id, { status: next });

        renderQAChecks(tabId, tabsState.tabs[tabId], keepOpen);
      });

      yesBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const keepOpen = getOpenIdsNow();

        const cur = getQAEntry(tabData, it.id).status;
        const next = (cur === true) ? null : true;
        setQAEntry(tabId, it.id, { status: next });

        renderQAChecks(tabId, tabsState.tabs[tabId], keepOpen);
      });

      obs.addEventListener("input", () => {
        setQAEntry(tabId, it.id, { obs: obs.value });
        updateQAOutput(tabId, tabsState.tabs[tabId]);
      });

      row.appendChild(txt);
      row.appendChild(group);
      row.appendChild(obs);

      block.appendChild(row);
    });

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });

  const outField = document.createElement("div");
  outField.className = "field field-full";
  outField.style.marginTop = "10px";

  const label = document.createElement("label");
  label.textContent = "Mensagem de QA";

  const out = document.createElement("textarea");
  out.id = "qaOutput_" + tabId;
  out.className = "readonly-multiline qa-output";
  out.readOnly = false;
  out.rows = 6;

  outField.appendChild(label);
  outField.appendChild(out);

  container.appendChild(outField);

  updateQAOutput(tabId, tabData);
}

/* ====================================================================== */
/* ============================ HELPERS UI ============================== */
/* ====================================================================== */

export function autoResizeTextareas(tabId) {
  const content = document.getElementById("content_" + tabId);
  if (!content) return;
  const textareas = content.querySelectorAll(
    "textarea.readonly-multiline, textarea.json-final"
  );
  textareas.forEach(t => {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + 4 + "px";
  });
}

export function renderCanais(tabId, canaisString) {
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

/* ====================================================================== */
/* ====================== HELPERS DATAS / QR ============================ */
/* ====================================================================== */

function formatBannerDateTime(str) {
  if (!str) return "";
  str = str.trim();

  const parts = str.split("T");
  if (parts.length !== 2) return str;

  const date = parts[0].trim();
  const timeRaw = parts[1].trim();

  const [hhStrRaw, mmStrRaw] = timeRaw.split(":");
  const hhStr = (hhStrRaw || "").padStart(2, "0");
  const mmStr = (mmStrRaw || "00").substring(0, 2).padStart(2, "0");

  return `${date} T ${hhStr}:${mmStr}`;
}

function parseDateOnly(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let datePart = s;

  if (s.includes("T")) {
    datePart = s.split("T")[0].trim();
  } else if (s.includes(" ")) {
    const chunks = s.split(" ");
    const candidate = chunks.find(c => c.includes("-"));
    if (candidate) {
      datePart = candidate.trim();
    }
  }

  const [y, m, d] = datePart.split("-");
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

function diffInDays(prevRaw, currRaw) {
  const d1 = parseDateOnly(prevRaw);
  const d2 = parseDateOnly(currRaw);
  if (!d1 || !d2) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((d2.getTime() - d1.getTime()) / msPerDay);
  return diff;
}

function getWaitLabelForPush(pushes, index) {
  if (!Array.isArray(pushes) || index <= 0) return "";
  const current = pushes[index];
  const previous = pushes[index - 1];
  if (!current || !previous) return "";

  const currRaw = current.dataInicioOriginal || current.dataInicio || "";
  const prevRaw = previous.dataInicioOriginal || previous.dataInicio || "";
  const diff = diffInDays(prevRaw, currRaw);
  if (diff == null || diff <= 0) return "";

  const label = diff === 1 ? "day" : "days";
  return ` (wait ${diff} ${label})`;
}

function buildQrCodeUrl(link) {
  if (!link) return "";
  const encoded = encodeURIComponent(link.trim());
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=300x300`;
}

function formatBannerDateTimeWithHint(str) {
  const base = formatBannerDateTime(str);
  if (!base) return "";

  const raw = (str || "").trim();
  if (!raw) return base;

  let datePart = "";
  let timePart = "";

  if (raw.includes("T")) {
    const [d, t] = raw.split("T");
    datePart = (d || "").trim();
    timePart = (t || "").trim();
  } else {
    const chunks = raw.split(" ");
    const candidate = chunks.find(c => c.includes("-"));
    if (!candidate) return base;
    datePart = candidate.trim();
    timePart = (chunks[chunks.indexOf(candidate) + 1] || "").trim();
  }

  const [y, m, d] = datePart.split("-");
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return base;

  let hh = 0;
  let mm = 0;
  if (timePart) {
    const [hhStr, mmStr] = timePart.split(":");
    hh = parseInt(hhStr || "0", 10);
    mm = parseInt((mmStr || "0").substring(0, 2), 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      hh = 0;
      mm = 0;
    }
  }

  const isPM = hh >= 12;
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;

  const mmPad = String(mm).padStart(2, "0");
  const monthUS = String(month).padStart(2, "0");
  const dayUS = String(day).padStart(2, "0");
  const suffix = isPM ? "PM" : "AM";

  const usPart = `${monthUS}/${dayUS}/${year}, ${hour12}:${mmPad} ${suffix}`;
  return `${base} (${usPart})`;
}

/* ====================================================================== */
/* =============== RENDERIZAÇÃO PUSH / BANNER / MKTSCREEN =============== */
/* ====================================================================== */

// ===================== RENDER PUSH =====================

export function renderPushList(tabId, pushes) {
  const container = document.getElementById("push_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!pushes || pushes.length === 0) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  pushes.forEach((p, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier2";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `push_${tabId}_${index}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "accordion-title";
    const num = p.numero || index + 1;
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

    const originalRaw = p.dataInicioOriginal || p.dataInicio || "";
    const originalFormatted = originalRaw ? formatBannerDateTime(originalRaw) : "";
    const waitLabel = getWaitLabelForPush(pushes, index);

    const hasMeta = originalFormatted || p.ctaType || p.observacao !== undefined;
    if (hasMeta) {
      const metaGroup = document.createElement("div");
      metaGroup.className = "info-group";

      const row = document.createElement("div");
      row.className = "info-row";

      if (originalFormatted) {
        const lbl = document.createElement("span");
        lbl.className = "info-label";
        lbl.textContent = "Data de Início (Original):";
        const val = document.createElement("span");
        val.className = "info-value";
        val.textContent = originalFormatted + waitLabel;
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

      const obsText =
        p.observacao && p.observacao.trim() !== "" ? p.observacao : "N/A";
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

    function addInputField(labelText, value, full = false, fieldKey = null, editable = false) {
      const field = document.createElement("div");
      field.className = "field";
      if (full) field.classList.add("field-full");

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";

      if (editable) {
        input.className = "input";
        input.readOnly = false;
      } else {
        input.className = "readonly";
        input.readOnly = true;
      }

      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (!tabData || !tabData.pushes || !tabData.pushes[index]) return;

          tabData.pushes[index][fieldKey] = input.value;
          p[fieldKey] = input.value;
          saveState();

          if (fieldKey === "dataInicio" || fieldKey === "horarioSaida") {
            updateFarolForTab(tabId);
          }
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      grid.appendChild(field);
    }

    addInputField("Nome Comunicação", p.nomeCom, true);

    const formattedStart = p.dataInicio ? formatBannerDateTime(p.dataInicio) : "";
    addInputField("Data de Início (Final)", formattedStart, false, "dataInicio", true);

    addInputField("Horário de Saída", p.horarioSaida, false, "horarioSaida", true);

    const rowTitulos = document.createElement("div");
    rowTitulos.className = "fields-grid-3";

    function addInputFieldRow(labelText, value, fieldKey, editable = false) {
      const field = document.createElement("div");
      field.className = "field";

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";

      if (editable) {
        input.className = "input";
        input.readOnly = false;
      } else {
        input.className = "readonly";
        input.readOnly = true;
      }

      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (!tabData || !tabData.pushes || !tabData.pushes[index]) return;
          tabData.pushes[index][fieldKey] = input.value;
          p[fieldKey] = input.value;
          saveState();
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      rowTitulos.appendChild(field);
    }

    addInputFieldRow("Título", p.titulo, "titulo", true);
    addInputFieldRow("Subtítulo", p.subtitulo, "subtitulo", true);
    addInputFieldRow("URL", p.url, "url", true);

    block.appendChild(grid);
    block.appendChild(rowTitulos);

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

// ===================== RENDER BANNERS =====================

export function renderBannerList(tabId, banners) {
  const container = document.getElementById("banner_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!banners || banners.length === 0) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  banners.forEach((b, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier2";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `banner_${tabId}_${index}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "accordion-title";
    const num = index + 1;
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

    let accTextarea = null;
    let jsonFinalArea = null;
    let img = null;
    let offerInput = null;

    const tabData = tabsState.tabs[tabId];
    let stored = null;
    let offerId = "";

    if (tabData && tabData.banners && tabData.banners[index]) {
      stored = tabData.banners[index].jsonFinal || null;
      offerId = tabData.banners[index].offerId || "";
    }

    function addInputField(labelText, value, full = false, fieldKey = null, editable = false) {
      const field = document.createElement("div");
      field.className = "field";
      if (full) field.classList.add("field-full");

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";

      if (editable) {
        input.className = "input";
        input.readOnly = false;
      } else {
        input.className = "readonly";
        input.readOnly = true;
      }

      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabDataInner = tabsState.tabs[tabId];
          if (!tabDataInner || !tabDataInner.banners || !tabDataInner.banners[index]) return;

          tabDataInner.banners[index][fieldKey] = input.value;
          b[fieldKey] = input.value;

          if (fieldKey === "imagem" && img) {
            img.src = input.value.trim();
          }

          saveState();

          if (fieldKey === "dataInicio" || fieldKey === "dataFim") {
            updateFarolForTab(tabId);
          }
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      grid.appendChild(field);
    }

    const infoTop = document.createElement("div");
    infoTop.className = "info-group";

    const rowDates = document.createElement("div");
    rowDates.className = "info-row";

    const startOriginal = b.dataInicioOriginal || b.dataInicio;
    if (startOriginal) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Data de Início (Original):";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = formatBannerDateTimeWithHint(startOriginal);
      rowDates.appendChild(lbl);
      rowDates.appendChild(val);
    }

    const endOriginal = b.dataFimOriginal || b.dataFim;
    if (endOriginal) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Data de Fim (Original):";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = formatBannerDateTimeWithHint(endOriginal);
      rowDates.appendChild(lbl);
      rowDates.appendChild(val);
    }

    const obsText =
      b.observacao && b.observacao.trim() !== "" ? b.observacao : "N/A";
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

    addInputField("Nome Experiência", b.nomeExp, true);

    const formattedIni = b.dataInicio ? formatBannerDateTime(b.dataInicio) : "";
    const formattedFim = b.dataFim ? formatBannerDateTime(b.dataFim) : "";

    addInputField("Data Início (Final)", formattedIni, false, "dataInicio", true);
    addInputField("Data Fim (Final)", formattedFim, false, "dataFim", true);
    addInputField("Channel", b.channel, false, "channel", true);
    addInputField("Imagem (URL)", b.imagem, true, "imagem", true);

    const accField = document.createElement("div");
    accField.className = "field";

    const accLabel = document.createElement("label");
    accLabel.textContent = "Accessibility Text";

    accTextarea = document.createElement("input");
    accTextarea.type = "text";
    accTextarea.className = "input";
    accTextarea.id = `accText_${tabId}_${index}`;

    if (b.accText) {
      accTextarea.value = b.accText;
    } else if (tabsState.ocrCache && b.imagem && tabsState.ocrCache[b.imagem]) {
      accTextarea.value = tabsState.ocrCache[b.imagem];
      if (tabData && tabData.banners && tabData.banners[index]) {
        tabData.banners[index].accText = accTextarea.value;
        saveState();
      }
    }

    accTextarea.addEventListener("input", () => {
      const currentTabData = tabsState.tabs[tabId];
      const value = accTextarea.value;

      if (currentTabData && currentTabData.banners && currentTabData.banners[index]) {
        currentTabData.banners[index].accText = value;
      }

      if (jsonFinalArea) {
        try {
          const obj = JSON.parse(jsonFinalArea.value || "{}");
          obj.accessibilityText = value || "titulo_da_imageUrl";
          const updated = JSON.stringify(obj, null, 2);
          jsonFinalArea.value = updated;

          if (currentTabData && currentTabData.banners && currentTabData.banners[index]) {
            currentTabData.banners[index].jsonFinal = updated;
            saveState();
          }
        } catch {
        }
      } else if (currentTabData) {
        saveState();
      }
    });

    accField.appendChild(accLabel);
    accField.appendChild(accTextarea);
    grid.appendChild(accField);

    const offerField = document.createElement("div");
    offerField.className = "field";

    const offerLabel = document.createElement("label");
    offerLabel.textContent = "Número do Offer ID";

    offerInput = document.createElement("input");
    offerInput.type = "text";
    offerInput.className = "input";
    offerInput.value = offerId || "";

    offerField.appendChild(offerLabel);
    offerField.appendChild(offerInput);
    grid.appendChild(offerField);

    block.appendChild(grid);

    if (b.imagem) {
      const previewBlock = document.createElement("div");
      previewBlock.className = "image-preview-block";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Mostrar imagem";
      btn.className = "btn-secondary";

      img = document.createElement("img");
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

    if (b.json) {
      const jsonField = document.createElement("div");
      jsonField.className = "field field-full";

      const details = document.createElement("details");
      details.className = "json-original-toggle";

      const summary = document.createElement("summary");
      summary.textContent = "JSON (Original)";

      const pre = document.createElement("pre");
      pre.className = "code-block";
      pre.textContent = b.json || "";

      details.appendChild(summary);
      details.appendChild(pre);
      jsonField.appendChild(details);

      const jsonFinalField = document.createElement("div");
      jsonFinalField.className = "field field-full";

      const jsonFinalDetails = document.createElement("details");
      jsonFinalDetails.className = "json-original-toggle";

      const jsonFinalSummary = document.createElement("summary");
      jsonFinalSummary.textContent = "JSON Fullimage (Final)";

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

        if (
          typeof obj.campaignTitle === "string" &&
          obj.campaignTitle.toLowerCase().includes("fullscreen")
        ) {
          obj.campaignTitle = "numero_do_offerID";
        }

        obj.campaignSubtitle = "";
        obj.messageButton = "";

        if (b.contentZone) {
          obj.campaignPosition = b.contentZone;
        }

        const initialAcc =
          b.accText && b.accText.trim() !== ""
            ? b.accText
            : "titulo_da_imageUrl";
        obj.accessibilityText = initialAcc;

        defaultFinalObj = obj;
        defaultFinalJson = JSON.stringify(obj, null, 2);
      } catch (e) {
        defaultFinalJson = b.json;
      }

      if (!stored && offerId && defaultFinalObj) {
        defaultFinalObj.campaignTitle = offerId;
        defaultFinalJson = JSON.stringify(defaultFinalObj, null, 2);
      }

      jsonFinalArea.value = stored || defaultFinalJson;

      if (
        tabData &&
        tabData.banners &&
        tabData.banners[index] &&
        !tabData.banners[index].jsonFinal
      ) {
        tabData.banners[index].jsonFinal = jsonFinalArea.value;
        saveState();
      }

      jsonFinalArea.addEventListener("input", () => {
        const tData = tabsState.tabs[tabId];
        if (tData && tData.banners && tData.banners[index]) {
          tData.banners[index].jsonFinal = jsonFinalArea.value;
          saveState();
        }
      });

      jsonFinalDetails.appendChild(jsonFinalSummary);
      jsonFinalDetails.appendChild(jsonFinalArea);
      jsonFinalField.appendChild(jsonFinalDetails);

      if (offerInput) {
        offerInput.addEventListener("input", () => {
          const value = offerInput.value.trim();
          const tData = tabsState.tabs[tabId];
          if (tData && tData.banners && tData.banners[index]) {
            tData.banners[index].offerId = value;
          }

          try {
            const obj = JSON.parse(jsonFinalArea.value || "{}");

            if (value) {
              obj.campaignTitle = value;
            } else {
              obj.campaignTitle = "numero_do_offerID";
            }

            const updated = JSON.stringify(obj, null, 2);
            jsonFinalArea.value = updated;

            if (tData && tData.banners && tData.banners[index]) {
              tData.banners[index].jsonFinal = updated;
              saveState();
            }
          } catch {
          }
        });
      }

      block.appendChild(jsonField);
      block.appendChild(jsonFinalField);
    }

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

// ===================== RENDER MKT SCREEN =====================

export function renderMktScreenView(tabId, mkt) {
  const container = document.getElementById("mkt_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!mkt) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  const geral = document.createElement("div");
  geral.className = "subsection";

  const grid = document.createElement("div");
  grid.className = "fields-grid";

  function addInputField(labelText, value, full = false, fieldKey = null, editable = false) {
    const field = document.createElement("div");
    field.className = "field";
    if (full) field.classList.add("field-full");

    const label = document.createElement("label");
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "text";

    if (editable) {
      input.className = "input";
      input.readOnly = false;
    } else {
      input.className = "readonly";
      input.readOnly = true;
    }

    input.value = value || "";

    if (editable && fieldKey) {
      input.addEventListener("input", () => {
        const tabData = tabsState.tabs[tabId];
        if (!tabData || !tabData.mktScreen) return;

        tabData.mktScreen[fieldKey] = input.value;
        mkt[fieldKey] = input.value;
        saveState();
      });
    }

    field.appendChild(label);
    field.appendChild(input);
    grid.appendChild(field);
  }

  addInputField("Channel", mkt.channel || "", true, "channel", true);
  addInputField("URL Marketing Screen", mkt.url || "", true, "url", true);

  geral.appendChild(grid);

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
      const tabData = tabsState.tabs[tabId];
      const currentMkt = tabData?.mktScreen || mkt;
      const link = (currentMkt.url || "").trim();
      if (!link) {
        alert("URL Marketing Screen vazia. Copie/cole o deeplink no card primeiro.");
        return;
      }

      qrImg.src = buildQrCodeUrl(link);
    }

    qrImg.style.display = visible ? "none" : "block";
    qrBtn.textContent = visible ? "Mostrar QR Code" : "Ocultar QR Code";
  });

  qrBlock.appendChild(qrBtn);
  qrBlock.appendChild(qrImg);
  geral.appendChild(qrBlock);

  const principalItem = document.createElement("div");
  principalItem.className = "accordion-item accordion-tier3";

  const headerP = document.createElement("div");
  headerP.className = "accordion-header accordion-header-small";
  headerP.dataset.accordionTarget = `mktPrincipal_${tabId}`;

  const titleP = document.createElement("span");
  titleP.className = "accordion-title";
  titleP.textContent = "Principal";

  const arrowP = document.createElement("span");
  arrowP.className = "accordion-arrow";
  arrowP.textContent = "▸";

  headerP.appendChild(titleP);
  headerP.appendChild(arrowP);

  const bodyP = document.createElement("div");
  bodyP.className = "accordion-body";
  bodyP.id = `mktPrincipal_${tabId}`;

  bodyP.appendChild(geral);
  principalItem.appendChild(headerP);
  principalItem.appendChild(bodyP);

  container.appendChild(principalItem);

  if (mkt.blocos && mkt.blocos.length > 0) {
    mkt.blocos.forEach((b, index) => {
      const item = document.createElement("div");
      item.className = "accordion-item accordion-tier2";

      const header = document.createElement("div");
      header.className = "accordion-header accordion-header-small";
      header.dataset.accordionTarget = `mkt_${tabId}_${index}`;

      const t = document.createElement("span");
      t.className = "accordion-title";
      t.textContent = `Bloco ${b.numero || index + 1}`;

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

      function addCodeFieldBloco(labelText, value, blocoIndex) {
        const field = document.createElement("div");
        field.className = "field field-full";

        const label = document.createElement("label");
        label.textContent = labelText;

        const ta = document.createElement("textarea");
        ta.className = "json-final";
        ta.rows = 8;
        ta.spellcheck = false;
        ta.value = value || "";

        ta.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (
            !tabData ||
            !tabData.mktScreen ||
            !Array.isArray(tabData.mktScreen.blocos) ||
            !tabData.mktScreen.blocos[blocoIndex]
          ) {
            return;
          }

          tabData.mktScreen.blocos[blocoIndex].json = ta.value;
          b.json = ta.value;
          saveState();
        });

        field.appendChild(label);
        field.appendChild(ta);
        gridBloco.appendChild(field);
      }

      addInputFieldBloco("Nome Experiência", b.nomeExp, true);
      addCodeFieldBloco("JSON do bloco", b.json, index);

      block.appendChild(gridBloco);
      body.appendChild(block);

      item.appendChild(header);
      item.appendChild(body);
      container.appendChild(item);
    });
  }
}

/* ====================================================================== */
/* ====================== PROCESSOS / FAROL / CONCLUSÃO ================= */
/* ====================================================================== */

function getFlag(tabData, name) {
  return !!(tabData.processFlags && tabData.processFlags[name]);
}

function setFlag(tabId, name, value) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;
  if (!tabData.processFlags) tabData.processFlags = {};
  tabData.processFlags[name] = !!value;
  saveState();
}

function getCheck(tabData, channel, key) {
  const checks = tabData.processChecks || {};
  return !!(checks[channel] && checks[channel][key]);
}

function setCheck(tabId, channel, key, value) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;
  if (!tabData.processChecks) tabData.processChecks = {};
  if (!tabData.processChecks[channel]) tabData.processChecks[channel] = {};
  tabData.processChecks[channel][key] = !!value;
  saveState();
}

function areAllChecksOn(tabData, channel, keys) {
  if (!tabData.processChecks || !tabData.processChecks[channel]) return false;
  const obj = tabData.processChecks[channel];
  return keys.every(k => !!obj[k]);
}

function applyToggleVisual(group, on) {
  const noBtn = group.querySelector(".toggle-chip.no");
  const yesBtn = group.querySelector(".toggle-chip.yes");
  if (!noBtn || !yesBtn) return;

  if (on) {
    yesBtn.classList.add("active");
    noBtn.classList.remove("active");
  } else {
    noBtn.classList.add("active");
    yesBtn.classList.remove("active");
  }
}

/* ===================== STATUS (linha Informações Gerais) ===================== */

function computeTabStatus(tabData) {
  const hasPush = Array.isArray(tabData.pushes) && tabData.pushes.length > 0;
  const hasBanner = Array.isArray(tabData.banners) && tabData.banners.length > 0;
  const hasMkt = !!tabData.mktScreen;

  const channels = [];
  if (hasPush) {
    channels.push({
      ready: "pushReadyQA",
      qa: "pushQAApproved",
      ativ: "pushAtivacaoApproved",
      done: "pushMsgGrupo"
    });
  }
  if (hasBanner) {
    channels.push({
      ready: "bannerReadyQA",
      qa: "bannerQAApproved",
      ativ: "bannerAtivacaoApproved",
      done: "bannerMsgGrupo"
    });
  }
  if (hasMkt) {
    channels.push({
      ready: "mktReadyQA",
      qa: "mktQAApproved",
      ativ: "mktAtivacaoApproved",
      done: "mktMsgGrupo"
    });
  }

  if (channels.length === 0) return "CONSTRUINDO";

  const all = (key) => channels.every(ch => getFlag(tabData, ch[key]));

  if (all("done")) return "CANAL CONCLUIDO!";
  if (all("ativ")) return "ATIVAÇÃO APROVADA!";
  if (all("qa")) return "QA APROVADO!";
  if (all("ready")) return "PRONTO PARA QA!";

  return "CONSTRUINDO";
}

function updateStatusLine(tabId, tabData) {
  const el = document.getElementById("statusText_" + tabId);
  if (!el) return;

  const status = computeTabStatus(tabData);
  el.textContent = status;

  // limpa classes anteriores
  el.classList.remove(
    "status-building",
    "status-ready",
    "status-qa",
    "status-ativ",
    "status-done"
  );

  // aplica classe conforme o texto do status
  if (status === "PRONTO PARA QA!") el.classList.add("status-ready");
  else if (status === "QA APROVADO!") el.classList.add("status-qa");
  else if (status === "ATIVAÇÃO APROVADA!") el.classList.add("status-ativ");
  else if (status === "CANAL CONCLUIDO!") el.classList.add("status-done");
  else el.classList.add("status-building");
}

/* ======================== PROCESSOS POR CANAL ======================== */

function renderPushProcess(tabId, tabData) {
  const container = document.getElementById("push_process_" + tabId);
  if (!container) return;

  container.innerHTML = "";

  const pushes = tabData.pushes || [];
  if (!pushes.length) {
    return;
  }

  const solicitanteEmail =
    (tabData.solicitanteEmail || tabData.solicitante || "").trim();
  const solicitanteHash = getHashForSolicitante(solicitanteEmail);

  const testsApproved = getFlag(tabData, "pushTestsApproved");
  const showProntoQA = testsApproved;
  const showQA = getFlag(tabData, "pushReadyQA");
  const showAtivacao = getFlag(tabData, "pushQAApproved");
  const showMsgGrupo = getFlag(tabData, "pushAtivacaoApproved");

  const accItem = document.createElement("div");
  accItem.className = "accordion-item accordion-tier3";

  const header = document.createElement("div");
  header.className = "accordion-header accordion-header-small";
  header.dataset.accordionTarget = `pushProcessWrap_${tabId}`;

  const titleSpan = document.createElement("span");
  titleSpan.className = "accordion-title";
  titleSpan.textContent = "Testes, QA e Envio/Ativação";

  const arrow = document.createElement("span");
  arrow.className = "accordion-arrow";
  arrow.textContent = "▸";

  header.appendChild(titleSpan);
  header.appendChild(arrow);

  const body = document.createElement("div");
  body.className = "accordion-body";
  body.id = `pushProcessWrap_${tabId}`;

  const section = document.createElement("div");
  section.className = "subsection";

  section.innerHTML = `
    <div class="process-section">

      ${
        solicitanteHash
          ? `
      <div class="field field-full">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Hash do solicitante:</span>
            <span class="info-value">${solicitanteHash}</span>
          </div>
        </div>
      </div>
      `
          : ""
      }

      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="pushTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
      </div>

      <div class="field field-full" style="${showProntoQA ? "" : "display:none;"}">
        <label>Pronto para QA?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="pushReadyQA">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="pushReadyQA">
            PRONTO PARA QA!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showQA ? "" : "display:none;"}">
        <label>QA Aprovado?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="pushQAApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="pushQAApproved">
            QA APROVADO!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showAtivacao ? "" : "display:none;"}">
        <label>Ativação Aprovada?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="pushAtivacaoApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="pushAtivacaoApproved">
            ENVIAR!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showMsgGrupo ? "" : "display:none;"}">
        <label>Mensagem no grupo de confirmação?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="pushMsgGrupo">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="pushMsgGrupo">
            CANAL CONCLUIDO!
          </div>
        </div>
      </div>
    </div>
  `;

  body.appendChild(section);
  accItem.appendChild(header);
  accItem.appendChild(body);
  container.appendChild(accItem);
}

function renderBannerProcessProcess(tabId, tabData) {
  const container = document.getElementById("banner_process_" + tabId);
  if (!container) return;

  container.innerHTML = "";

  const banners = tabData.banners || [];
  if (!banners.length) {
    return;
  }

  const testsApproved = getFlag(tabData, "bannerTestsApproved");
  const showProntoQA = testsApproved;
  const showQA = getFlag(tabData, "bannerReadyQA");
  const showAtivacao = getFlag(tabData, "bannerQAApproved");
  const showMsgGrupo = getFlag(tabData, "bannerAtivacaoApproved");

  const accItem = document.createElement("div");
  accItem.className = "accordion-item accordion-tier3";

  const header = document.createElement("div");
  header.className = "accordion-header accordion-header-small";
  header.dataset.accordionTarget = `bannerProcessWrap_${tabId}`;

  const titleSpan = document.createElement("span");
  titleSpan.className = "accordion-title";
  titleSpan.textContent = "Testes, QA e Envio/Ativação";

  const arrow = document.createElement("span");
  arrow.className = "accordion-arrow";
  arrow.textContent = "▸";

  header.appendChild(titleSpan);
  header.appendChild(arrow);

  const body = document.createElement("div");
  body.className = "accordion-body";
  body.id = `bannerProcessWrap_${tabId}`;

  const section = document.createElement("div");
  section.className = "subsection";

  section.innerHTML = `
    <div class="process-section">

      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="bannerTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
      </div>

      <div class="field field-full" style="${showProntoQA ? "" : "display:none;"}">
        <label>Pronto para QA?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="bannerReadyQA">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="bannerReadyQA">
            PRONTO PARA QA!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showQA ? "" : "display:none;"}">
        <label>QA Aprovado?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="bannerQAApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="bannerQAApproved">
            QA APROVADO!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showAtivacao ? "" : "display:none;"}">
        <label>Ativação Aprovada?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="bannerAtivacaoApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="bannerAtivacaoApproved">
            ATIVAR!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showMsgGrupo ? "" : "display:none;"}">
        <label>Mensagem no grupo de confirmação?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="bannerMsgGrupo">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="bannerMsgGrupo">
            CANAL CONCLUIDO!
          </div>
        </div>
      </div>
    </div>
  `;

  body.appendChild(section);
  accItem.appendChild(header);
  accItem.appendChild(body);
  container.appendChild(accItem);
}

function renderMktProcess(tabId, tabData) {
  const container = document.getElementById("mkt_process_" + tabId);
  if (!container) return;

  container.innerHTML = "";

  const mkt = tabData.mktScreen;
  if (!mkt) {
    return;
  }

  const testsApproved = getFlag(tabData, "mktTestsApproved");
  const showProntoQA = testsApproved;
  const showQA = getFlag(tabData, "mktReadyQA");
  const showAtivacao = getFlag(tabData, "mktQAApproved");
  const showMsgGrupo = getFlag(tabData, "mktAtivacaoApproved");

  const accItem = document.createElement("div");
  accItem.className = "accordion-item accordion-tier3";

  const header = document.createElement("div");
  header.className = "accordion-header accordion-header-small";
  header.dataset.accordionTarget = `mktProcessWrap_${tabId}`;

  const titleSpan = document.createElement("span");
  titleSpan.className = "accordion-title";
  titleSpan.textContent = "Testes, QA e Envio/Ativação";

  const arrow = document.createElement("span");
  arrow.className = "accordion-arrow";
  arrow.textContent = "▸";

  header.appendChild(titleSpan);
  header.appendChild(arrow);

  const body = document.createElement("div");
  body.className = "accordion-body";
  body.id = `mktProcessWrap_${tabId}`;

  const section = document.createElement("div");
  section.className = "subsection";

  section.innerHTML = `
    <div class="process-section">

      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="mktTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
      </div>

      <div class="field field-full" style="${showProntoQA ? "" : "display:none;"}">
        <label>Pronto para QA?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="mktReadyQA">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="mktReadyQA">
            PRONTO PARA QA!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showQA ? "" : "display:none;"}">
        <label>QA Aprovado?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="mktQAApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="mktQAApproved">
            QA APROVADO!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showAtivacao ? "" : "display:none;"}">
        <label>Ativação Aprovada?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="mktAtivacaoApproved">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="mktAtivacaoApproved">
            ATIVAR!
          </div>
        </div>
      </div>

      <div class="field field-full" style="${showMsgGrupo ? "" : "display:none;"}">
        <label>Mensagem no grupo de confirmação?</label>
        <div class="process-row">
          <div class="toggle-group" data-flag="mktMsgGrupo">
            <button type="button" class="toggle-chip no">Não</button>
            <button type="button" class="toggle-chip yes">Sim</button>
          </div>
          <div class="process-status" data-flag-text="mktMsgGrupo">
            CANAL CONCLUIDO!
          </div>
        </div>
      </div>
    </div>
  `;

  body.appendChild(section);
  accItem.appendChild(header);
  accItem.appendChild(body);
  container.appendChild(accItem);
}

/* ============================== FAROL ================================ */

function buildPushDateTimeString(p) {
  const raw = (p.dataInicio || "").trim();
  const horarioSaida = (p.horarioSaida || "").trim();

  let datePart = "";
  let timePart = "";

  if (raw) {
    const parts = raw.split("T");
    if (parts.length === 2) {
      datePart = parts[0].trim();
      const timeRaw = (parts[1] || "").trim();
      if (timeRaw) {
        const [hhStrRaw, mmStrRaw] = timeRaw.split(":");
        const hhStr = (hhStrRaw || "").padStart(2, "0");
        const mmStr = (mmStrRaw || "00").substring(0, 2).padStart(2, "0");
        timePart = `${hhStr}:${mmStr}`;
      }
    } else {
      datePart = raw;
    }
  }

  if (horarioSaida) {
    timePart = horarioSaida;
  }

  if (datePart && timePart) return `${datePart} T ${timePart}`;
  if (datePart) return datePart;
  if (timePart) return `T ${timePart}`;
  return "";
}

function buildBannerRangeString(b) {
  const ini = b.dataInicio ? formatBannerDateTime(b.dataInicio) : "";
  const fim = b.dataFim ? formatBannerDateTime(b.dataFim) : "";

  if (ini && fim) return `${ini} - ${fim}`;
  if (ini) return ini;
  if (fim) return fim;
  return "";
}

function buildFarolText(tabData) {
  const base = tabData.base || "N/A";
  const journey = tabData.nome || "N/A";
  const pushes = tabData.pushes || [];
  const banners = tabData.banners || [];
  const mkt = tabData.mktScreen;

  let txt = `~Farol\n\n`;
  txt += `Audience:\n${base}\n\n`;
  txt += `Journey:\n${journey}\n\n`;

  if (pushes.length) {
    const lines = pushes
      .map(p => {
        const name = p.nomeCom || "";
        if (!name) return null;
        const when = buildPushDateTimeString(p);
        return when ? `${name} (${when})` : name;
      })
      .filter(Boolean);
    if (lines.length) {
      txt += `Pushs:\n${lines.join("\n")}\n\n`;
    }
  }

  if (banners.length) {
    const lines = banners
      .map(b => {
        const name = b.nomeExp || b.nomeCampanha || "";
        if (!name) return null;
        const range = buildBannerRangeString(b);
        return range ? `${name} (${range})` : name;
      })
      .filter(Boolean);
    if (lines.length) {
      txt += `Banners:\n${lines.join("\n")}\n\n`;
    }
  }

  if (mkt && mkt.blocos && mkt.blocos.length) {
    const lines = mkt.blocos.map(b => b.nomeExp || "").filter(Boolean);
    if (lines.length) {
      txt += `MarketingScreen:\n${lines.join("\n")}\n`;
    }
  }

  return txt.trim();
}

function updateFarolForTab(tabId) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;

  const newText = buildFarolText(tabData);
  tabData.farolText = newText;
  tabsState.tabs[tabId] = tabData;
  saveState();

  const area = document.getElementById("farolText_" + tabId);
  if (area) {
    area.value = newText;
  }
}

function renderFarolConclusao(tabId, tabData) {
  const hasPush = (tabData.pushes || []).length > 0;
  const hasBanner = (tabData.banners || []).length > 0;
  const hasMkt = !!tabData.mktScreen;

  const anyChannel = hasPush || hasBanner || hasMkt;

  let farolUnlocked = anyChannel;
  if (hasPush)   farolUnlocked = farolUnlocked && getFlag(tabData, "pushReadyQA");
  if (hasBanner) farolUnlocked = farolUnlocked && getFlag(tabData, "bannerReadyQA");
  if (hasMkt)    farolUnlocked = farolUnlocked && getFlag(tabData, "mktReadyQA");

  const farolAcc = document.getElementById("farolAccordion_" + tabId);
  const farolContainer = document.getElementById("farol_container_" + tabId);
  if (!farolAcc || !farolContainer) return;

  if (!farolUnlocked) {
    farolAcc.style.display = "none";
    farolContainer.innerHTML = "";
    return;
  }

  farolAcc.style.display = "";

  const section = document.createElement("div");
  section.className = "subsection";

  const farolField = document.createElement("div");
  farolField.className = "field field-full";

  const farolLabel = document.createElement("label");
  farolLabel.textContent = "Mensagem do Farol";
  farolField.appendChild(farolLabel);

  const farolArea = document.createElement("textarea");
  farolArea.className = "readonly-multiline farol-textarea";
  farolArea.rows = 10;
  farolArea.readOnly = false;
  farolArea.id = "farolText_" + tabId;

  const initialFarolText =
    tabData.farolText && tabData.farolText.trim() !== ""
      ? tabData.farolText
      : buildFarolText(tabData);

  farolArea.value = initialFarolText;

  farolArea.addEventListener("input", () => {
    const tData = tabsState.tabs[tabId];
    if (!tData) return;
    tData.farolText = farolArea.value;
    saveState();
  });

  farolField.appendChild(farolArea);
  section.appendChild(farolField);

  farolContainer.innerHTML = "";
  farolContainer.appendChild(section);
}

/* ===================== RE-RENDER PROCESSOS ===================== */

function reRenderProcessesForTab(tabId, openIds = []) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;
  renderChannelProcesses(tabId, tabData);

  if (openIds && openIds.length) {
    openIds.forEach(id => {
      const body = document.getElementById(id);
      if (!body) return;
      body.classList.add("open");
      const header = document.querySelector(
        `.accordion-header[data-accordion-target="${id}"]`
      );
      if (header) header.classList.add("open");
    });
  }
}

function attachProcessHandlers(tabId, tabData) {
  const root = document.getElementById("content_" + tabId);
  if (!root) return;

  function getOpenAccordionIds() {
    return Array.from(root.querySelectorAll(".accordion-body.open")).map(
      b => b.id
    );
  }

  root.querySelectorAll(".toggle-group[data-flag]").forEach(group => {
    const flagName = group.dataset.flag;
    const current = getFlag(tabData, flagName);

    applyToggleVisual(group, current);

    const noBtn = group.querySelector(".toggle-chip.no");
    const yesBtn = group.querySelector(".toggle-chip.yes");

    if (noBtn) {
      noBtn.addEventListener("click", () => {
        const openIds = getOpenAccordionIds();
        setFlag(tabId, flagName, false);
        reRenderProcessesForTab(tabId, openIds);
      });
    }

    if (yesBtn) {
      yesBtn.addEventListener("click", () => {
        const openIds = getOpenAccordionIds();
        setFlag(tabId, flagName, true);
        reRenderProcessesForTab(tabId, openIds);
      });
    }
  });

  root.querySelectorAll(".process-status[data-flag-text]").forEach(el => {
    const name = el.dataset.flagText;
    const on = getFlag(tabData, name);
    el.style.display = on ? "block" : "none";
  });
}

/* ===================== FUNÇÃO PRINCIPAL ===================== */

export function renderChannelProcesses(tabId, tabData) {
  if (!tabData) return;
  if (!tabData.processFlags) tabData.processFlags = {};
  if (!tabData.processChecks) tabData.processChecks = {};
  if (!tabData.processMeta) tabData.processMeta = {};

  tabsState.tabs[tabId] = tabData;

  renderPushProcess(tabId, tabData);
  renderBannerProcessProcess(tabId, tabData);
  renderMktProcess(tabId, tabData);
  renderFarolConclusao(tabId, tabData);

  updateStatusLine(tabId, tabData);

  attachProcessHandlers(tabId, tabData);
}
