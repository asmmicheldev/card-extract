// js/renderers.js
import { tabsState, saveState } from "./state.js";

// ==== CONFIG OCR (depois você troca a key) ====
const OCR_API_KEY = "K81669629288957";

// -------- helpers visuais ---------

export function autoResizeTextareas(tabId) {
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

// Canais (>0)
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

// -------- OCR / QR helpers --------

// Formata "2025-11-17T10:00" -> "2025-11-17 T 10:00 (10 AM)"
function formatBannerDateTime(str) {
  if (!str) return "";
  str = str.trim();

  const parts = str.split("T");
  if (parts.length !== 2) return str;

  const date = parts[0].trim();
  const timeRaw = parts[1].trim();

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

// Monta a URL de QR Code a partir do deeplink
function buildQrCodeUrl(link) {
  if (!link) return "";
  const encoded = encodeURIComponent(link.trim());
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=300x300`;
}

// Usa o OCR.Space para extrair o texto da imagem
async function fetchAccessibilityText(imageUrl, textarea, tabId) {
  if (!textarea) return;

  if (!imageUrl) {
    textarea.value = "";
    return;
  }

  if (!tabsState.ocrCache) {
    tabsState.ocrCache = {};
  }

  // 1) cache
  const cached = tabsState.ocrCache[imageUrl];
  if (cached) {
    textarea.value = cached;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    autoResizeTextareas(tabId);
    return;
  }

  textarea.value = "Lendo texto da imagem...";

  try {
    const form = new FormData();
    form.append("apikey", OCR_API_KEY);
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
    const txt = data?.ParsedResults?.[0]?.ParsedText?.trim();
    const finalText = txt || "Nenhum texto encontrado.";

    textarea.value = finalText;
    tabsState.ocrCache[imageUrl] = finalText;
    saveState();

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (e) {
    console.error("Erro OCR:", e);
    textarea.value = "Erro ao processar imagem.";
  }

  autoResizeTextareas(tabId);
}

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

    // meta
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
    item.className = "accordion-item";

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

    // datas / obs
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

    // Título / Sub / CTA
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

    // layout meta
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

    // grid campos
    addInputField("Nome Experiência", b.nomeExp, true);
    addInputField("Channel", b.channel, false);
    addInputField("Imagem (URL)", b.imagem, true);

    // Accessibility Text
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
        } catch {
          // ignora json inválido
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

    // preview imagem
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

    // JSONs
    if (b.json) {
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

        if (typeof obj.campaignTitle === "string" &&
          obj.campaignTitle.toLowerCase().includes("fullscreen")) {
          obj.campaignTitle = "numero_do_offerID";
        }

        obj.campaignSubtitle = "";
        obj.messageButton = "";

        if (b.contentZone) {
          obj.campaignPosition = b.contentZone;
        }

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
        stored = tabData.banners[index].jsonFinal || null;
        offerId = tabData.banners[index].offerId || "";
      }

      if (!stored && offerId && defaultFinalObj) {
        defaultFinalObj.campaignTitle = offerId;
        defaultFinalJson = JSON.stringify(defaultFinalObj, null, 2);
      }

      jsonFinalArea.value = stored || defaultFinalJson;

      if (tabData && tabData.banners && tabData.banners[index] && !tabData.banners[index].jsonFinal) {
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

      jsonFinalField.appendChild(jsonFinalLabel);
      jsonFinalField.appendChild(jsonFinalArea);

      // Offer ID
      const offerField = document.createElement("div");
      offerField.className = "field field-full";

      const offerLabel = document.createElement("label");
      offerLabel.textContent = "Número do Offer ID";

      const offerRow = document.createElement("div");
      offerRow.className = "acc-row";

      const offerInput = document.createElement("input");
      offerInput.type = "text";
      offerInput.className = "input";
      offerInput.value = offerId || "";

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
          // ignora se json inválido
        }
      });

      offerRow.appendChild(offerInput);
      offerField.appendChild(offerLabel);
      offerField.appendChild(offerRow);

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
