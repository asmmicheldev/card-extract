// js/main.js
import { tabsState, saveState, loadState, getNextTabId } from "./state.js";
import {
  parseTitulo,
  parseInformacoesGerais,
  parseDados,
  parseCommunications
} from "./parsers.js";
import {
  renderCanais,
  renderPushList,
  renderBannerList,
  renderMktScreenView,
  autoResizeTextareas,
  renderChannelProcesses,
  renderQAChecks
} from "./renderers.js";

// ===== helpers de DOM =====

function setFieldValue(prefix, tabId, value) {
  const el = document.getElementById(prefix + tabId);
  if (el) el.value = value || "";
}

function setTextValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

/**
 * Extrai o "título base" da aba a partir do header do card.
 * Regras:
 * - Se tiver "|", pega tudo antes do "|"
 * - Se tiver "[", pega tudo antes do "["
 * - Se tiver " - " (com espaços), assume "MARCA - CODIGO - ..." e mantém "MARCA - CODIGO"
 * - Caso contrário, devolve a string toda
 */
function extractBaseTabTitle(raw) {
  const s = (raw || "").trim();
  if (!s) return "Card";

  if (s.includes("|")) return s.split("|")[0].trim();
  if (s.includes("[")) return s.split("[")[0].trim();

  const parts = s.split(" - ");
  // Ex: "XP - INV_B2B... - Campanha ..." => ["XP", "INV_B2B...", "Campanha ..."]
  // Queremos "XP - INV_B2B..."
  if (parts.length >= 2) return parts.slice(0, 2).join(" - ").trim();

  return s;
}

function getFirstNonEmptyLine(texto) {
  const linhas = (texto || "").split(/\r?\n/);
  const first = linhas.find(l => String(l || "").trim() !== "");
  return (first || "").trim();
}

function ensureProcessStructures(data) {
  if (!data.processFlags) data.processFlags = {};
  if (!data.processChecks) data.processChecks = {};
  if (!data.processMeta) data.processMeta = {};
  if (!data.qa) data.qa = { items: {} };
  if (!data.qa.items) data.qa.items = {};
}

function ensureTitleStructures(data) {
  if (typeof data.baseTitle !== "string") data.baseTitle = "";
  if (typeof data.customTitle !== "string") data.customTitle = "";
}

function resolveTabTitle(tabData) {
  const custom = (tabData?.customTitle || "").trim();
  if (custom) return custom;

  const base = (tabData?.baseTitle || "").trim();
  if (base) return base;

  return tabData?.title || tabData?.fullTitle || "Card";
}

function renderCardLink(tabId, tabData) {
  const host = document.getElementById("cardLink_" + tabId);
  if (!host) return;

  host.innerHTML = "";

  const nome =
    tabData?.fullTitle ||
    tabData?.tituloCompleto ||
    tabData?.title ||
    tabData?.nome ||
    "Card";

  const url = (tabData?.cardUrl || "").trim();

  if (url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "link-card";
    a.textContent = nome;
    host.appendChild(a);
  } else {
    host.textContent = nome;
  }
}

function updateTabTitleDom(tabId, titleText) {
  const tabEl = document.getElementById(tabId);
  if (!tabEl) return;
  const titleEl = tabEl.querySelector(".tab-title");
  if (titleEl) titleEl.textContent = titleText || "Card";
}

function startEditTabTitle(tabId) {
  const tabEl = document.getElementById(tabId);
  if (!tabEl) return;

  const currentData = tabsState.tabs[tabId] || {};
  ensureTitleStructures(currentData);

  const titleSpan = tabEl.querySelector(".tab-title");
  if (!titleSpan) return;

  const currentTitle = resolveTabTitle(currentData);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "tab-title-edit";
  input.value = currentTitle;
  input.autocomplete = "off";
  input.spellcheck = false;

  // Evita trocar de aba enquanto edita
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("mousedown", (e) => e.stopPropagation());

  let cancelled = false;

  const finish = (commit) => {
    const tabData = tabsState.tabs[tabId] || {};
    ensureTitleStructures(tabData);

    if (commit && !cancelled) {
      const val = (input.value || "").trim();
      tabData.customTitle = val; // se vazio => volta pro baseTitle
      tabData.title = resolveTabTitle(tabData); // mantém compatibilidade com usos antigos
      tabsState.tabs[tabId] = tabData;
      saveState();
    }

    const span = document.createElement("span");
    span.className = "tab-title";
    span.textContent = resolveTabTitle(tabsState.tabs[tabId] || tabData) || "Card";
    input.replaceWith(span);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelled = true;
      finish(false);
    }
  });

  input.addEventListener("blur", () => finish(true));

  titleSpan.replaceWith(input);
  input.focus();
  input.select();
}

// ===================== UI: CRIAÇÃO DE ABAS =====================

function createTabFromState(tabId, data) {
  ensureProcessStructures(data);
  ensureTitleStructures(data);

  // Migração/garantia: se não tiver baseTitle, tenta derivar do input salvo
  if (!data.baseTitle || !data.baseTitle.trim()) {
    const firstLine = getFirstNonEmptyLine(data.input || "");
    data.baseTitle = extractBaseTabTitle(firstLine);
  }

  // Garante que o .title exibido fique coerente
  data.title = resolveTabTitle(data);

  tabsState.tabs[tabId] = data;

  const tab = document.createElement("div");
  tab.className = "tab";
  tab.id = tabId;

  tab.onclick = () => switchTab(tabId);

  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = resolveTabTitle(data);

  const edit = document.createElement("span");
  edit.className = "edit-tab";
  edit.title = "Editar nome da aba";
  edit.textContent = "✎";
  edit.onclick = (e) => {
    e.stopPropagation();
    startEditTabTitle(tabId);
  };

  const close = document.createElement("span");
  close.className = "close-tab";
  close.textContent = "×";
  close.onclick = (e) => {
    e.stopPropagation();

    const tabInfo = tabsState.tabs[tabId];
    const nomeAba = resolveTabTitle(tabInfo);

    const querFechar = confirm(`Tem certeza que deseja fechar a aba "${nomeAba}"?`);
    if (querFechar) closeTab(tabId);
  };

  tab.appendChild(title);
  tab.appendChild(edit);
  tab.appendChild(close);

  const addBtn = document.getElementById("add-tab");
  document.getElementById("tabs-container").insertBefore(tab, addBtn);

  const content = document.createElement("div");
  content.className = "section";
  content.id = "content_" + tabId;

  content.innerHTML = `
    <h2>Card</h2>
    <div class="card-row">
      <div class="field card-col" style="flex: 1;">
        <label>Card Original</label>
        <textarea
          id="cardOriginal_${tabId}"
          class="card-input"
          rows="1"
          oninput="processCard('${tabId}', this.value)"
          onpaste="handlePaste(event)">${data.input || ""}</textarea>
      </div>
    </div>

    <h2>Informações Gerais</h2>

    <div class="info-group">
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span id="statusText_${tabId}" class="info-value status-value">CONSTRUINDO</span>
      </div>

      <div class="info-row">
        <span class="info-label">Card:</span>
        <span id="cardLink_${tabId}" class="info-value"></span>
      </div>

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
        <input
          id="base_${tabId}"
          class="input"
          type="text"
          value="${data.base || ""}"
          oninput="handleBaseChange('${tabId}', this.value)">
      </div>
    </div>

    <!-- Anotações -->
    <div class="accordion accordion-tier4">
      <div class="accordion-header" data-accordion-target="notesWrap_${tabId}">
        <span class="accordion-title">Anotações</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="notesWrap_${tabId}" class="accordion-body">
        <div class="field field-full">
          <textarea
            id="notes_${tabId}"
            class="readonly-multiline notes-input"
            rows="4"
            oninput="handleNotesChange('${tabId}', this.value)">${data.anotacoes || ""}</textarea>
        </div>
      </div>
    </div>

    <!-- Checks de QA -->
    <div class="accordion accordion-tier4" style="margin-top:12px;">
      <div class="accordion-header" data-accordion-target="qaWrap_${tabId}">
        <span class="accordion-title">Checks de QA</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="qaWrap_${tabId}" class="accordion-body">
        <div id="qa_container_${tabId}"></div>
      </div>
    </div>

    <!-- Farol -->
    <div id="farolAccordion_${tabId}" class="accordion accordion-tier4" style="display:none;">
      <div class="accordion-header" data-accordion-target="farolWrap_${tabId}">
        <span class="accordion-title">Farol</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="farolWrap_${tabId}" class="accordion-body">
        <div id="farol_container_${tabId}"></div>
      </div>
    </div>

    <!-- Push pai -->
    <div class="accordion accordion-tier1">
      <div class="accordion-header" data-accordion-target="pushWrap_${tabId}">
        <span class="accordion-title">Push</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="pushWrap_${tabId}" class="accordion-body">
        <div id="push_process_${tabId}"></div>
        <div id="push_container_${tabId}"></div>
      </div>
    </div>

    <!-- Banner pai -->
    <div class="accordion accordion-tier1">
      <div class="accordion-header" data-accordion-target="bannerWrap_${tabId}">
        <span class="accordion-title">Banner</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="bannerWrap_${tabId}" class="accordion-body">
        <div id="banner_process_${tabId}"></div>
        <div id="banner_container_${tabId}"></div>
      </div>
    </div>

    <!-- MktScreen pai -->
    <div class="accordion accordion-tier1">
      <div class="accordion-header" data-accordion-target="mktWrap_${tabId}">
        <span class="accordion-title">Marketing Screen</span>
        <span class="accordion-arrow">▸</span>
      </div>
      <div id="mktWrap_${tabId}" class="accordion-body">
        <div id="mkt_process_${tabId}"></div>
        <div id="mkt_container_${tabId}"></div>
      </div>
    </div>
  `;

  document.getElementById("content-container").appendChild(content);

  renderCardLink(tabId, data);

  if (data.canais) renderCanais(tabId, data.canais);

  renderPushList(tabId, data.pushes || []);
  renderBannerList(tabId, data.banners || []);
  renderMktScreenView(tabId, data.mktScreen || null);
  renderChannelProcesses(tabId, data);
  renderQAChecks(tabId, data);

  autoResizeTextareas(tabId);
}

function createTab() {
  const tabId = getNextTabId();

  tabsState.tabs[tabId] = {
    title: "Card",
    baseTitle: "Card",
    customTitle: "",
    input: "",
    nome: "",
    fullTitle: "",
    descricao: "",
    cardUrl: "",
    area: "",
    solicitante: "",
    marca: "",
    descCamp: "",
    canais: "",
    tempo: "",
    base: "",
    observacao: "",
    anotacoes: "",
    farolText: "",
    pushes: [],
    banners: [],
    mktScreen: null,
    processFlags: {},
    processChecks: {},
    processMeta: {},
    qa: { items: {} }
  };

  createTabFromState(tabId, tabsState.tabs[tabId]);
  switchTab(tabId);
  saveState();
}

function switchTab(tabId) {
  tabsState.activeTab = tabId;

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".section").forEach(c => (c.style.display = "none"));

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

  const pushes  = comm.pushes || [];
  const banners = comm.banners || [];
  const mkt     = comm.mktScreen;

  const tabData = tabsState.tabs[tabId] || {};
  ensureProcessStructures(tabData);
  ensureTitleStructures(tabData);

  const oldPushes = tabData.pushes || [];
  const mergedPushes = pushes.map((p, idx) => {
    const old = oldPushes[idx] || {};

    const newOriginal = p.dataInicioOriginal || p.dataInicio || "";
    const original =
      newOriginal ||
      old.dataInicioOriginal ||
      old.dataInicio ||
      "";

    const finalValue = old.dataInicio || p.dataInicio || "";

    return {
      ...p,
      dataInicioOriginal: original,
      dataInicio: finalValue,
      horarioSaida: old.horarioSaida || ""
    };
  });

  const oldBanners = tabData.banners || [];
  const mergedBanners = banners.map((b, idx) => {
    const old = oldBanners[idx] || {};

    const originalInicio =
      b.dataInicioOriginal ||
      b.dataInicio ||
      old.dataInicioOriginal ||
      old.dataInicio ||
      "";
    const originalFim =
      b.dataFimOriginal ||
      b.dataFim ||
      old.dataFimOriginal ||
      old.dataFim ||
      "";

    const finalInicio = old.dataInicio || b.dataInicio || "";
    const finalFim    = old.dataFim || b.dataFim || "";

    return {
      ...b,
      dataInicioOriginal: originalInicio,
      dataFimOriginal: originalFim,
      dataInicio: finalInicio,
      dataFim: finalFim,
      accText:   old.accText   || "",
      jsonFinal: old.jsonFinal || "",
      offerId:   old.offerId   || ""
    };
  });

  setFieldValue("nome_", tabId, titulo.nome);
  setFieldValue("base_", tabId, dados.base);

  // ===== TÍTULO DA ABA: determinístico (prefixo do header), com override manual =====
  const rawHeader = getFirstNonEmptyLine(texto) || (titulo.tituloCompleto || "");
  const baseTitle = extractBaseTabTitle(rawHeader);

  tabData.baseTitle = baseTitle || tabData.baseTitle || "Card";

  // Se tiver customTitle, NUNCA sobrescreve com parsing
  const displayTitle = resolveTabTitle(tabData);
  tabData.title = displayTitle;

  updateTabTitleDom(tabId, displayTitle);

  // ===== resto do processamento =====
  const fullTitle = titulo.tituloCompleto || displayTitle;

  setTextValue("desc_" + tabId, titulo.descricao);
  setTextValue("solicitanteText_" + tabId, info.solicitante);
  setTextValue("descCamp_" + tabId, info.descCamp);
  setTextValue("obsText_" + tabId, dados.observacao);

  renderCanais(tabId, info.canais);

  tabData.input          = texto;
  tabData.nome           = titulo.nome;
  tabData.fullTitle      = fullTitle;
  tabData.tituloCompleto = titulo.tituloCompleto || "";
  tabData.descricao      = titulo.descricao;
  tabData.cardUrl        = titulo.cardUrl || "";

  tabData.area        = info.area;
  tabData.solicitante = info.solicitante;
  tabData.marca       = info.marca;
  tabData.descCamp    = info.descCamp;
  tabData.canais      = info.canais;
  tabData.tempo       = info.tempo;

  tabData.base        = dados.base;
  tabData.observacao  = dados.observacao;

  tabData.pushes      = mergedPushes;
  tabData.banners     = mergedBanners;
  tabData.mktScreen   = mkt;

  tabsState.tabs[tabId] = tabData;

  renderCardLink(tabId, tabData);

  renderPushList(tabId, mergedPushes);
  renderBannerList(tabId, mergedBanners);
  renderMktScreenView(tabId, mkt);
  renderChannelProcesses(tabId, tabData);
  renderQAChecks(tabId, tabData);

  autoResizeTextareas(tabId);
  saveState();
}

function handleNotesChange(tabId, value) {
  const tabData = tabsState.tabs[tabId] || {};
  tabData.anotacoes = value;
  tabsState.tabs[tabId] = tabData;
  saveState();
}

function handleBaseChange(tabId, value) {
  const tabData = tabsState.tabs[tabId] || {};
  tabData.base = value;
  tabsState.tabs[tabId] = tabData;
  renderChannelProcesses(tabId, tabData);
  saveState();
}

function handlePaste(event) {
  const ta = event.target;
  setTimeout(() => {
    ta.scrollTop = 0;
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

  tabElement.remove();
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

// ==== funções globais pros handlers inline ====
window.processCard = processCard;
window.handlePaste = handlePaste;
window.handleNotesChange = handleNotesChange;
window.handleBaseChange = handleBaseChange;
