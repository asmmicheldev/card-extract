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
  if (el) {
    el.value = value || "";
  }
}

function setTextValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value || "";
  }
}

function buildTabTitleFromTitulo(titulo) {
  if (!titulo) return "Card";

  if (titulo.descricao && titulo.descricao.trim() !== "") {
    return titulo.descricao.trim();
  }

  if (titulo.tituloCompleto && titulo.tituloCompleto.trim() !== "") {
    return titulo.tituloCompleto.trim();
  }

  if (titulo.nome && titulo.descricao) {
    return `${titulo.nome} - ${titulo.descricao}`;
  }

  if (titulo.nome) return titulo.nome;

  return "Card";
}

function ensureProcessStructures(data) {
  if (!data.processFlags) data.processFlags = {};
  if (!data.processChecks) data.processChecks = {};
  if (!data.processMeta) data.processMeta = {};
  if (!data.qa) data.qa = { items: {} };
  if (!data.qa.items) data.qa.items = {};
}

// ===================== UI: CRIAÇÃO DE ABAS =====================

function createTabFromState(tabId, data) {
  ensureProcessStructures(data);

  // limpeza defensiva (caso existam dados antigos no localStorage)
  if ("cardExtract" in data) delete data.cardExtract;

  tabsState.tabs[tabId] = data;

  const tab = document.createElement("div");
  tab.className = "tab";
  tab.id = tabId;

  tab.onclick = () => switchTab(tabId);

  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = data.title || data.fullTitle || "Card";

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

  // REMOVIDO: Card Extract + Export/Import
  content.innerHTML = `
    <h2>Card</h2>
    <div class="card-row">
      <div class="field card-col">
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

    <!-- ADD: Checks de QA -->
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

  if (data.canais) {
    renderCanais(tabId, data.canais);
  }

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
    input: "",
    // REMOVIDO: cardExtract
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

  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".section").forEach((c) => (c.style.display = "none"));

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

  const pushes = comm.pushes || [];
  const banners = comm.banners || [];
  const mkt = comm.mktScreen;

  const tabData = tabsState.tabs[tabId] || {};
  ensureProcessStructures(tabData);

  const oldPushes = tabData.pushes || [];
  const mergedPushes = pushes.map((p, idx) => {
    const old = oldPushes[idx] || {};

    const newOriginal = p.dataInicioOriginal || p.dataInicio || "";
    const original = newOriginal || old.dataInicioOriginal || old.dataInicio || "";

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
      b.dataInicioOriginal || b.dataInicio || old.dataInicioOriginal || old.dataInicio || "";
    const originalFim =
      b.dataFimOriginal || b.dataFim || old.dataFimOriginal || old.dataFim || "";

    const finalInicio = old.dataInicio || b.dataInicio || "";
    const finalFim = old.dataFim || b.dataFim || "";

    return {
      ...b,
      dataInicioOriginal: originalInicio,
      dataFimOriginal: originalFim,
      dataInicio: finalInicio,
      dataFim: finalFim,
      accText: old.accText || "",
      jsonFinal: old.jsonFinal || "",
      offerId: old.offerId || ""
    };
  });

  setFieldValue("nome_", tabId, titulo.nome);
  setFieldValue("base_", tabId, dados.base);

  const tabDisplayTitle = buildTabTitleFromTitulo(titulo);
  const fullTitle = titulo.tituloCompleto || tabDisplayTitle;

  const tabTitleEl = document.querySelector(`#${tabId} .tab-title`);
  if (tabTitleEl) {
    tabTitleEl.textContent = tabDisplayTitle;
  }

  setTextValue("desc_" + tabId, titulo.descricao);
  setTextValue("solicitanteText_" + tabId, info.solicitante);
  setTextValue("descCamp_" + tabId, info.descCamp);
  setTextValue("obsText_" + tabId, dados.observacao);

  renderCanais(tabId, info.canais);

  tabData.title = tabDisplayTitle; // texto curto da aba
  tabData.input = texto;
  tabData.nome = titulo.nome;
  tabData.fullTitle = fullTitle; // nome completo
  tabData.tituloCompleto = titulo.tituloCompleto || "";
  tabData.descricao = titulo.descricao;
  tabData.cardUrl = titulo.cardUrl || "";

  tabData.area = info.area;
  tabData.solicitante = info.solicitante;
  tabData.marca = info.marca;
  tabData.descCamp = info.descCamp;
  tabData.canais = info.canais;
  tabData.tempo = info.tempo;

  tabData.base = dados.base;
  tabData.observacao = dados.observacao;

  tabData.pushes = mergedPushes;
  tabData.banners = mergedBanners;
  tabData.mktScreen = mkt;

  tabsState.tabs[tabId] = tabData;

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

// limpeza global de legado do Export/Import
for (const id in tabsState.tabs) {
  if (tabsState.tabs[id] && "cardExtract" in tabsState.tabs[id]) {
    delete tabsState.tabs[id].cardExtract;
  }
}
saveState();

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
