// js/state.js

// Estado geral da aplicação
export let tabsState = {
  tabs: {},
  activeTab: null,
  ocrCache: {}
};

let tabCount = 0;

// Salva no localStorage
export function saveState() {
  localStorage.setItem("cardExtractData", JSON.stringify(tabsState));
}

// Carrega do localStorage e ajusta tabCount
export function loadState() {
  const saved = localStorage.getItem("cardExtractData");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        tabsState = parsed;
      }
    } catch (e) {
      console.error("Erro ao ler state do localStorage:", e);
    }
  }

  if (!tabsState.tabs) tabsState.tabs = {};
  if (!tabsState.ocrCache) tabsState.ocrCache = {};

  const ids = Object.keys(tabsState.tabs)
    .map(id => parseInt(id.replace("tab_", ""), 10))
    .filter(n => !isNaN(n));

  tabCount = ids.length > 0 ? Math.max(...ids) : 0;
}

// Gera um novo id de aba (tab_1, tab_2, ...)
export function getNextTabId() {
  tabCount += 1;
  return "tab_" + tabCount;
}
