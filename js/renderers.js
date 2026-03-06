// js/renderers.js
import { tabsState, saveState } from "./state.js";

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
/* ========================== RENDER EMAIL ============================== */
/* ====================================================================== */

export function renderEmailList(tabId, emails) {
  const container = document.getElementById("email_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!emails || emails.length === 0) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  emails.forEach((e, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier2";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `email_${tabId}_${index}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "accordion-title";
    titleSpan.textContent = `Email ${index + 1}`;

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▸";

    header.appendChild(titleSpan);
    header.appendChild(arrow);

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.id = `email_${tabId}_${index}`;

    const block = document.createElement("div");
    block.className = "subsection";

    const metaGroup = document.createElement("div");
    metaGroup.className = "info-group";

    const row = document.createElement("div");
    row.className = "info-row";

    if (e.dataInicio) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Data de Início:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = e.dataInicio;
      row.appendChild(lbl);
      row.appendChild(val);
    }

    if (e.sender) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Sender:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = e.sender;
      row.appendChild(lbl);
      row.appendChild(val);
    }

    if (e.ctaType) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "CTA Type:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = e.ctaType;
      row.appendChild(lbl);
      row.appendChild(val);
    }

    metaGroup.appendChild(row);
    block.appendChild(metaGroup);

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
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (!tabData || !tabData.emails || !tabData.emails[index]) return;
          tabData.emails[index][fieldKey] = input.value;
          e[fieldKey] = input.value;
          saveState();
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      grid.appendChild(field);
    }

    addInputField("Nome Comunicação", e.nomeCom, true, null, false);
    addInputField("Caminho Content Builder", e.caminhoContentBuilder, true, null, false);

    const rowEditable = document.createElement("div");
    rowEditable.className = "fields-grid-3";

    function addInputFieldRow(labelText, value, fieldKey, editable = false) {
      const field = document.createElement("div");
      field.className = "field";

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (!tabData || !tabData.emails || !tabData.emails[index]) return;
          tabData.emails[index][fieldKey] = input.value;
          e[fieldKey] = input.value;
          saveState();
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      rowEditable.appendChild(field);
    }

    addInputFieldRow("Assunto", e.assunto, "assunto", true);
    addInputFieldRow("Pre Header", e.preHeader, "preHeader", true);
    addInputFieldRow("CTA", e.cta, "cta", true);

    block.appendChild(grid);
    block.appendChild(rowEditable);
    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

/* ====================================================================== */
/* ======================== RENDER WHATSAPP ============================= */
/* ====================================================================== */

export function renderWhatsAppList(tabId, whatsApps) {
  const container = document.getElementById("whatsApp_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!whatsApps || whatsApps.length === 0) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  whatsApps.forEach((w, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier2";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `whatsapp_${tabId}_${index}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "accordion-title";
    titleSpan.textContent = `WhatsApp ${index + 1}`;

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▸";

    header.appendChild(titleSpan);
    header.appendChild(arrow);

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.id = `whatsapp_${tabId}_${index}`;

    const block = document.createElement("div");
    block.className = "subsection";

    const grid = document.createElement("div");
    grid.className = "fields-grid";

    const fieldNome = document.createElement("div");
    fieldNome.className = "field field-full";

    const labelNome = document.createElement("label");
    labelNome.textContent = "Nome Comunicação";

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.className = "readonly";
    inputNome.readOnly = true;
    inputNome.value = w.nomeCom || "";

    fieldNome.appendChild(labelNome);
    fieldNome.appendChild(inputNome);
    grid.appendChild(fieldNome);

    block.appendChild(grid);

    const jsonField = document.createElement("div");
    jsonField.className = "field field-full";

    const jsonLabel = document.createElement("label");
    jsonLabel.textContent = "Json";

    const jsonArea = document.createElement("textarea");
    jsonArea.className = "json-final";
    jsonArea.rows = 10;
    jsonArea.spellcheck = false;
    jsonArea.value = w.json || "";

    jsonArea.addEventListener("input", () => {
      const tabData = tabsState.tabs[tabId];
      if (!tabData || !tabData.whatsApps || !tabData.whatsApps[index]) return;
      tabData.whatsApps[index].json = jsonArea.value;
      w.json = jsonArea.value;
      saveState();
    });

    jsonField.appendChild(jsonLabel);
    jsonField.appendChild(jsonArea);

    block.appendChild(jsonField);

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

/* ====================================================================== */
/* =========================== RENDER PUSH ============================== */
/* ====================================================================== */

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
    titleSpan.textContent = `Push ${index + 1}`;

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

    const originalRaw = p.dataInicio || "";
    const originalFormatted = originalRaw ? formatBannerDateTime(originalRaw) : "";

    const hasMeta = originalFormatted || p.ctaType || p.observacao !== undefined;
    if (hasMeta) {
      const metaGroup = document.createElement("div");
      metaGroup.className = "info-group";

      const row = document.createElement("div");
      row.className = "info-row";

      if (originalFormatted) {
        const lbl = document.createElement("span");
        lbl.className = "info-label";
        lbl.textContent = "Data de Início:";
        const val = document.createElement("span");
        val.className = "info-value";
        val.textContent = originalFormatted;
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
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
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
      grid.appendChild(field);
    }

    addInputField("Nome Comunicação", p.nomeCom, true);

    const rowTitulos = document.createElement("div");
    rowTitulos.className = "fields-grid-3";

    function addInputFieldRow(labelText, value, fieldKey, editable = false) {
      const field = document.createElement("div");
      field.className = "field";

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
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

/* ====================================================================== */
/* ========================== RENDER BANNER ============================= */
/* ====================================================================== */

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
    titleSpan.textContent = `Banner ${index + 1}`;

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

    const tabData = tabsState.tabs[tabId];
    let stored = null;

    if (tabData && tabData.banners && tabData.banners[index]) {
      stored = tabData.banners[index].jsonFinal || null;
    }

    function addInputField(labelText, value, full = false, fieldKey = null, editable = false) {
      const field = document.createElement("div");
      field.className = "field";
      if (full) field.classList.add("field-full");

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
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

    const startOriginal = b.dataInicio;
    if (startOriginal) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Data de Início:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = formatBannerDateTimeWithHint(startOriginal);
      rowDates.appendChild(lbl);
      rowDates.appendChild(val);
    }

    const endOriginal = b.dataFim;
    if (endOriginal) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Data de Fim:";
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

    block.appendChild(grid);

    if (b.imagem && String(b.imagem).trim() !== "") {
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

      let defaultFinalJson = "";
      try {
        const obj = JSON.parse(b.json);
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

        defaultFinalJson = JSON.stringify(obj, null, 2);
      } catch (e) {
        defaultFinalJson = b.json;
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

      block.appendChild(jsonField);
      block.appendChild(jsonFinalField);
    }

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

/* ====================================================================== */
/* =========================== RENDER INAPP ============================= */
/* ====================================================================== */

export function renderInAppList(tabId, inApps) {
  const container = document.getElementById("inApp_container_" + tabId);
  if (!container) return;

  const accordion = container.closest(".accordion");
  container.innerHTML = "";

  if (!inApps || inApps.length === 0) {
    if (accordion) accordion.style.display = "none";
    return;
  }

  if (accordion) accordion.style.display = "";

  inApps.forEach((iapp, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item accordion-tier2";

    const header = document.createElement("div");
    header.className = "accordion-header accordion-header-small";
    header.dataset.accordionTarget = `inapp_${tabId}_${index}`;

    const titleSpan = document.createElement("span");
    titleSpan.className = "accordion-title";
    titleSpan.textContent = `InApp ${index + 1}`;

    const arrow = document.createElement("span");
    arrow.className = "accordion-arrow";
    arrow.textContent = "▸";

    header.appendChild(titleSpan);
    header.appendChild(arrow);

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.id = `inapp_${tabId}_${index}`;

    const block = document.createElement("div");
    block.className = "subsection";

    const infoTop = document.createElement("div");
    infoTop.className = "info-group";

    const row1 = document.createElement("div");
    row1.className = "info-row";

    if (iapp.dataInicio) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Data de Início:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = formatBannerDateTimeWithHint(iapp.dataInicio);
      row1.appendChild(lbl);
      row1.appendChild(val);
    }

    if (iapp.dataFim) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Data de Fim:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = formatBannerDateTimeWithHint(iapp.dataFim);
      row1.appendChild(lbl);
      row1.appendChild(val);
    }

    const row2 = document.createElement("div");
    row2.className = "info-row";

    if (iapp.titulo) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Título:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = iapp.titulo;
      row2.appendChild(lbl);
      row2.appendChild(val);
    }

    if (iapp.subtitulo) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Subtítulo:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = iapp.subtitulo;
      row2.appendChild(lbl);
      row2.appendChild(val);
    }

    if (iapp.cta) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "CTA:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = iapp.cta;
      row2.appendChild(lbl);
      row2.appendChild(val);
    }

    const row3 = document.createElement("div");
    row3.className = "info-row";

    if (iapp.tela) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.textContent = "Tela:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = iapp.tela;
      row3.appendChild(lbl);
      row3.appendChild(val);
    }

    if (iapp.tipoInapp) {
      const lbl = document.createElement("span");
      lbl.className = "info-label";
      lbl.style.marginLeft = "12px";
      lbl.textContent = "Tipo Inapp:";
      const val = document.createElement("span");
      val.className = "info-value";
      val.textContent = iapp.tipoInapp;
      row3.appendChild(lbl);
      row3.appendChild(val);
    }

    infoTop.appendChild(row1);
    infoTop.appendChild(row2);
    infoTop.appendChild(row3);
    block.appendChild(infoTop);

    const grid = document.createElement("div");
    grid.className = "fields-grid";

    let img = null;
    let jsonFinalArea = null;

    function addInputField(labelText, value, full = false, fieldKey = null, editable = false) {
      const field = document.createElement("div");
      field.className = "field";
      if (full) field.classList.add("field-full");

      const label = document.createElement("label");
      label.textContent = labelText;

      const input = document.createElement("input");
      input.type = "text";
      input.className = editable ? "input" : "readonly";
      input.readOnly = !editable;
      input.value = value || "";

      if (editable && fieldKey) {
        input.addEventListener("input", () => {
          const tabData = tabsState.tabs[tabId];
          if (!tabData || !tabData.inApps || !tabData.inApps[index]) return;

          tabData.inApps[index][fieldKey] = input.value;
          iapp[fieldKey] = input.value;

          if (fieldKey === "imagem" && img) {
            img.src = input.value.trim();
          }

          if (fieldKey === "imagem" && jsonFinalArea) {
            try {
              const obj = JSON.parse(jsonFinalArea.value || "{}");
              obj.imageUrl = input.value;
              const updated = JSON.stringify(obj, null, 2);
              jsonFinalArea.value = updated;
              tabData.inApps[index].jsonFinal = updated;
            } catch {
            }
          }

          saveState();
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      grid.appendChild(field);
    }

    addInputField("Nome Experiência", iapp.nomeExp, true, null, false);
    addInputField("Imagem (URL)", iapp.imagem, true, "imagem", true);

    block.appendChild(grid);

    if (iapp.imagem && String(iapp.imagem).trim() !== "") {
      const previewBlock = document.createElement("div");
      previewBlock.className = "image-preview-block";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Mostrar imagem";
      btn.className = "btn-secondary";

      img = document.createElement("img");
      img.src = iapp.imagem;
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

    const jsonField = document.createElement("div");
    jsonField.className = "field field-full";

    const details = document.createElement("details");
    details.className = "json-original-toggle";

    const summary = document.createElement("summary");
    summary.textContent = "JSON (Original)";

    const pre = document.createElement("pre");
    pre.className = "code-block";
    pre.textContent = iapp.json || "";

    details.appendChild(summary);
    details.appendChild(pre);
    jsonField.appendChild(details);

    const jsonFinalField = document.createElement("div");
    jsonFinalField.className = "field field-full";

    const jsonFinalDetails = document.createElement("details");
    jsonFinalDetails.className = "json-original-toggle";

    const jsonFinalSummary = document.createElement("summary");
    jsonFinalSummary.textContent = "JSON (Final)";

    jsonFinalArea = document.createElement("textarea");
    jsonFinalArea.className = "json-final";
    jsonFinalArea.style.width = "100%";
    jsonFinalArea.style.minHeight = "220px";
    jsonFinalArea.style.fontFamily = "monospace";
    jsonFinalArea.rows = 10;
    jsonFinalArea.spellcheck = false;

    const tabData = tabsState.tabs[tabId];
    const stored =
      tabData && tabData.inApps && tabData.inApps[index]
        ? tabData.inApps[index].jsonFinal || ""
        : "";

    jsonFinalArea.value = stored || iapp.json || "";

    if (
      tabData &&
      tabData.inApps &&
      tabData.inApps[index] &&
      !tabData.inApps[index].jsonFinal
    ) {
      tabData.inApps[index].jsonFinal = jsonFinalArea.value;
      saveState();
    }

    jsonFinalArea.addEventListener("input", () => {
      const tData = tabsState.tabs[tabId];
      if (tData && tData.inApps && tData.inApps[index]) {
        tData.inApps[index].jsonFinal = jsonFinalArea.value;
        saveState();
      }
    });

    jsonFinalDetails.appendChild(jsonFinalSummary);
    jsonFinalDetails.appendChild(jsonFinalArea);
    jsonFinalField.appendChild(jsonFinalDetails);

    block.appendChild(jsonField);
    block.appendChild(jsonFinalField);

    body.appendChild(block);
    item.appendChild(header);
    item.appendChild(body);
    container.appendChild(item);
  });
}

/* ====================================================================== */
/* ======================= RENDER MARKETING SCREEN ====================== */
/* ====================================================================== */

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
    input.className = editable ? "input" : "readonly";
    input.readOnly = !editable;
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
  principalItem.className = "accordion-item accordion-tier4";

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
      t.textContent = `Bloco ${index + 1}`;

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
/* ============================== FAROL ================================ */
/* ====================================================================== */

function buildFarolText(tabData) {
  const base = tabData.base || "N/A";
  const journey = tabData.nome || "N/A";
  const emails = tabData.emails || [];
  const whatsApps = tabData.whatsApps || [];
  const pushes = tabData.pushes || [];
  const banners = tabData.banners || [];
  const inApps = tabData.inApps || [];
  const mkt = tabData.mktScreen;

  let txt = `~Farol\n\n`;
  txt += `Audience:\n${base}\n\n`;
  txt += `Journey:\n${journey}\n\n`;

  if (emails.length) {
    const lines = emails.map(e => e.nomeCom || "").filter(Boolean);
    if (lines.length) {
      txt += `Emails:\n${lines.join("\n")}\n\n`;
    }
  }

  if (whatsApps.length) {
    const lines = whatsApps.map(w => w.nomeCom || "").filter(Boolean);
    if (lines.length) {
      txt += `WhatsApp:\n${lines.join("\n")}\n\n`;
    }
  }

  if (pushes.length) {
    const lines = pushes.map(p => p.nomeCom || "").filter(Boolean);
    if (lines.length) {
      txt += `Pushs:\n${lines.join("\n")}\n\n`;
    }
  }

  if (banners.length) {
    const lines = banners.map(b => b.nomeExp || b.nomeCampanha || "").filter(Boolean);
    if (lines.length) {
      txt += `Banners:\n${lines.join("\n")}\n\n`;
    }
  }

  if (inApps.length) {
    const lines = inApps.map(i => i.nomeExp || i.nomeCampanha || "").filter(Boolean);
    if (lines.length) {
      txt += `InApps:\n${lines.join("\n")}\n\n`;
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

export function renderFarolPanel(tabId, tabData) {
  const farolContainer = document.getElementById("farol_container_" + tabId);
  if (!farolContainer) return;

  const generatedText = buildFarolText(tabData);
  const previousAuto = tabData.farolAutoText || "";
  const currentText = tabData.farolText || "";

  const shouldReplaceText =
    !currentText.trim() ||
    currentText === previousAuto;

  if (shouldReplaceText) {
    tabData.farolText = generatedText;
  }

  tabData.farolAutoText = generatedText;
  tabsState.tabs[tabId] = tabData;
  saveState();

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
  farolArea.value = tabData.farolText || generatedText;

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