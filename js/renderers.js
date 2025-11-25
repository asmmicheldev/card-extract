// js/renderers.js
import { tabsState, saveState } from "./state.js";

// ==== CONFIG OCR (depois você troca a key) ====
const OCR_API_KEY = "K81669629288957";

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

// -------- helpers visuais ---------

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

  let lastDate = null;

  pushes.forEach((p, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item";

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

    // helper para Título/Subtítulo/URL editáveis
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
          // mantém objeto local alinhado também
          p[fieldKey] = input.value;
          saveState();
        });
      }

      field.appendChild(label);
      field.appendChild(input);
      rowTitulos.appendChild(field);
    }

    // agora esses 3 são editáveis
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
    let img = null; // vamos setar depois no preview, mas já existe aqui

    // helper genérico de input, com opção de ser editável
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
          if (!tabData || !tabData.banners || !tabData.banners[index]) return;

          tabData.banners[index][fieldKey] = input.value;
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

    // Título / Sub / CTA (somente display)
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
    addInputField("Nome Experiência", b.nomeExp, true);                 // readonly
    addInputField("Channel", b.channel, false, "channel", true);       // EDITÁVEL
    addInputField("Imagem (URL)", b.imagem, true, "imagem", true);     // EDITÁVEL

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
      const tabData = tabsState.tabs[tabId];
      const bannersArr = (tabData && tabData.banners) || [];
      const currentBanner = bannersArr[index] || b;

      const imgUrl = currentBanner.imagem || b.imagem;

      if (!imgUrl) {
        accTextarea.value = "Nenhuma URL de imagem.";
        return;
      }
      fetchAccessibilityText(imgUrl, accTextarea, tabId);
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

  // ----- Principal (Channel + URL + QR) como toggle -----
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

  // agora Channel e URL são editáveis
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

  // Wrap do "Principal" num accordion-item
  const principalItem = document.createElement("div");
  principalItem.className = "accordion-item";

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

  // ----- Blocos -----
  if (mkt.blocos && mkt.blocos.length > 0) {
    mkt.blocos.forEach((b, index) => {
      const item = document.createElement("div");
      item.className = "accordion-item";

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
        ta.className = "json-final";   // reaproveita estilo de JSON Final
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
      // JSON do bloco agora é editável
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

/* ---- Processos por canal ---- */


function renderPushProcess(tabId, tabData) {
  const container = document.getElementById("push_process_" + tabId);
  if (!container) return;

  container.innerHTML = "";

  const pushes = tabData.pushes || [];
  if (!pushes.length) {
    // se não tem push, não mostra bloco de processo de push
    return;
  }

  const nomeCard = tabData.nome || "Sem nome";
  const cardUrl = tabData.cardUrl || "";

  // pega email do solicitante e calcula hash
  const solicitanteEmail =
    (tabData.solicitanteEmail || tabData.solicitante || "").trim();
  const solicitanteHash = getHashForSolicitante(solicitanteEmail);

  // --- flags para controlar a fila ---
  const testsApproved = getFlag(tabData, "pushTestsApproved");
  const checksOk = areAllChecksOn(tabData, "push", [
    "baseTesteOk",
    "segmentacaoOk",
    "horarioOk",
    "conteudoOk"
  ]);

  const showProntoQA = testsApproved && checksOk; // só aparece se testes = SIM + todas checks
  const showQA = getFlag(tabData, "pushReadyQA"); // QA só aparece se Pronto QA = SIM
  const showAtivacao = getFlag(tabData, "pushQAApproved"); // Ativação só depois do QA
  const showMsgGrupo = getFlag(tabData, "pushAtivacaoApproved"); // Mensagem só depois da Ativação

  const accItem = document.createElement("div");
  accItem.className = "accordion-item";

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

      <div class="field field-full">
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Card:</span>
            <span class="info-value">
              ${
                cardUrl
                  ? `<a href="${cardUrl}" target="_blank" class="link-card">${nomeCard}</a>`
                  : nomeCard
              }
            </span>
          </div>

          ${
            solicitanteHash
              ? `
          <div class="info-row">
            <span class="info-label">Hash do solicitante:</span>
            <span class="info-value">${solicitanteHash}</span>
          </div>
          `
              : ""
          }
        </div>
      </div>

      <!-- Testes Aprovados? = toggle + checklist que só aparece no SIM -->
      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="pushTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>

        <div class="checklist" style="${testsApproved ? "" : "display:none;"}">
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="push" data-key="baseTesteOk">
            Base de teste configurada
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="push" data-key="segmentacaoOk">
            Segmentação correta
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="push" data-key="horarioOk">
            Data/horário corretos
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="push" data-key="conteudoOk">
            Conteúdo (título/texto/CTA) ok
          </label>
        </div>
      </div>

      <!-- Pronto para QA? só aparece se testes = SIM + todas checks -->
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

      <!-- QA Aprovado? só aparece se Pronto para QA = SIM -->
      <div class="field field-full" style="${showQA ? "" : "display:none;"}">
        <label>QA Aprovado?</label>
        <div class="toggle-group" data-flag="pushQAApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
      </div>

      <!-- Ativação Aprovada? só aparece se QA Aprovado = SIM -->
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

      <!-- Mensagem grupo só aparece se Ativação = SIM -->
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

  const nomeCard = tabData.nome || "Sem nome";
  const cardUrl = tabData.cardUrl || "";

  const testsApproved = getFlag(tabData, "bannerTestsApproved");
  const checksOk = areAllChecksOn(tabData, "banner", [
    "bannerDesativado",
    "dataInicioOriginal",
    "baseOriginal",
    "prioridadeOriginal",
    "dataCorreta",
    "horarioCorreto"
  ]);

  const showProntoQA = testsApproved && checksOk;
  const showQA = getFlag(tabData, "bannerReadyQA");
  const showAtivacao = getFlag(tabData, "bannerQAApproved");
  const showMsgGrupo = getFlag(tabData, "bannerAtivacaoApproved");

  const accItem = document.createElement("div");
  accItem.className = "accordion-item";

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
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Card:</span>
            <span class="info-value">
              ${
                cardUrl
                  ? `<a href="${cardUrl}" target="_blank" class="link-card">${nomeCard}</a>`
                  : nomeCard
              }
            </span>
          </div>
        </div>
      </div>

      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="bannerTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
        <div class="checklist" style="${testsApproved ? "" : "display:none;"}">
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="bannerDesativado">
            Banner desativado
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="dataInicioOriginal">
            dataInicio original (caso precisar alterar)
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="baseOriginal">
            Base original
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="prioridadeOriginal">
            Prioridade original > Confirmar no Teams – 750
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="dataCorreta">
            Data correta
          </label>
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="banner" data-key="horarioCorreto">
            Horário correto
          </label>
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
        <div class="toggle-group" data-flag="bannerQAApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
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

  const nomeCard = tabData.nome || "Sem nome";
  const cardUrl = tabData.cardUrl || "";

  const testsApproved = getFlag(tabData, "mktTestsApproved");
  const checksOk = areAllChecksOn(tabData, "mkt", ["linksFuncionando"]);
  const showProntoQA = testsApproved && checksOk;
  const showQA = getFlag(tabData, "mktReadyQA");
  const showAtivacao = getFlag(tabData, "mktQAApproved");
  const showMsgGrupo = getFlag(tabData, "mktAtivacaoApproved");

  const accItem = document.createElement("div");
  accItem.className = "accordion-item";

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
        <div class="info-group">
          <div class="info-row">
            <span class="info-label">Card:</span>
            <span class="info-value">
              ${
                cardUrl
                  ? `<a href="${cardUrl}" target="_blank" class="link-card">${nomeCard}</a>`
                  : nomeCard
              }
            </span>
          </div>
        </div>
      </div>

      <div class="field field-full">
        <label>Testes Aprovados?</label>
        <div class="toggle-group" data-flag="mktTestsApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
        </div>
        <div class="checklist" style="${testsApproved ? "" : "display:none;"}">
          <label class="check-item">
            <input type="checkbox" class="process-checkbox"
                   data-channel="mkt" data-key="linksFuncionando">
            Links funcionando?
          </label>
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
        <div class="toggle-group" data-flag="mktQAApproved">
          <button type="button" class="toggle-chip no">Não</button>
          <button type="button" class="toggle-chip yes">Sim</button>
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



/* ---- FAROL / CONCLUSÃO ---- */

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

  if (mkt && mkt.blocos && mkt.blocos.length) {
    const lines = mkt.blocos.map(b => b.nomeExp || "").filter(Boolean);
    if (lines.length) {
      txt += `MarketingScreen:\n${lines.join("\n")}\n`;
    }
  }

  return txt.trim();
}

function buildQaMessageText(tabData) {
  const nome = tabData.nome || "";
  const url = tabData.cardUrl || "";
  if (url) {
    return `Pronto para QA!\n${nome}\n${url}`;
  }
  return `Pronto para QA!\n${nome}`;
}

function renderFarolConclusao(tabId, tabData) {
  const hasPush = (tabData.pushes || []).length > 0;
  const hasBanner = (tabData.banners || []).length > 0;
  const hasMkt = !!tabData.mktScreen;

  const anyChannel = hasPush || hasBanner || hasMkt;

  // FAROL: depende de Ready QA de todos canais presentes
  let farolUnlocked = anyChannel;
  if (hasPush) farolUnlocked = farolUnlocked && getFlag(tabData, "pushReadyQA");
  if (hasBanner) farolUnlocked = farolUnlocked && getFlag(tabData, "bannerReadyQA");
  if (hasMkt) farolUnlocked = farolUnlocked && getFlag(tabData, "mktReadyQA");

  // CONCLUSÃO: depende de MsgGrupo de todos canais presentes
  let conclusaoUnlocked = anyChannel;
  if (hasPush) conclusaoUnlocked = conclusaoUnlocked && getFlag(tabData, "pushMsgGrupo");
  if (hasBanner) conclusaoUnlocked = conclusaoUnlocked && getFlag(tabData, "bannerMsgGrupo");
  if (hasMkt) conclusaoUnlocked = conclusaoUnlocked && getFlag(tabData, "mktMsgGrupo");

  const nomeCard = tabData.nome || "Sem nome";
  const cardUrl = tabData.cardUrl || "";

  // FAROL
  const farolAcc = document.getElementById("farolAccordion_" + tabId);
  const farolContainer = document.getElementById("farol_container_" + tabId);
  if (farolAcc && farolContainer) {
    if (!farolUnlocked) {
      farolAcc.style.display = "none";
      farolContainer.innerHTML = "";
    } else {
      farolAcc.style.display = "";
      const section = document.createElement("div");
      section.className = "subsection";

      const farolText = buildFarolText(tabData);

      // Mensagem do Farol
      const farolField = document.createElement("div");
      farolField.className = "field field-full";

      const farolLabel = document.createElement("label");
      farolLabel.textContent = "Mensagem do Farol";
      farolField.appendChild(farolLabel);

      const farolArea = document.createElement("textarea");
      farolArea.className = "readonly-multiline";
      farolArea.rows = 8;
      farolArea.readOnly = true;
      farolArea.value = farolText;
      farolField.appendChild(farolArea);

      section.appendChild(farolField);

      // Mensagem para QA
      const qaField = document.createElement("div");
      qaField.className = "field field-full";

      const qaLabel = document.createElement("label");
      qaLabel.textContent = "Mensagem para QA";
      qaField.appendChild(qaLabel);

      const infoGroup = document.createElement("div");
      infoGroup.className = "info-group";

      const rowMsg = document.createElement("div");
      rowMsg.className = "info-row";
      const lblMsg = document.createElement("span");
      lblMsg.className = "info-label";
      lblMsg.textContent = "Texto:";
      const valMsg = document.createElement("span");
      valMsg.className = "info-value";
      valMsg.textContent = "Pronto para QA!";
      rowMsg.appendChild(lblMsg);
      rowMsg.appendChild(valMsg);

      const rowCard = document.createElement("div");
      rowCard.className = "info-row";
      const lblCard = document.createElement("span");
      lblCard.className = "info-label";
      lblCard.textContent = "Card:";
      const valCard = document.createElement("span");
      valCard.className = "info-value";
      if (cardUrl) {
        valCard.innerHTML = `<a href="${cardUrl}" target="_blank" class="link-card">${nomeCard}</a>`;
      } else {
        valCard.textContent = nomeCard;
      }
      rowCard.appendChild(lblCard);
      rowCard.appendChild(valCard);

      infoGroup.appendChild(rowMsg);
      infoGroup.appendChild(rowCard);
      qaField.appendChild(infoGroup);

      section.appendChild(qaField);

      farolContainer.innerHTML = "";
      farolContainer.appendChild(section);
    }
  }

  // CONCLUSÃO
  const conclAcc = document.getElementById("conclusaoAccordion_" + tabId);
  const conclContainer = document.getElementById("conclusao_container_" + tabId);
  if (conclAcc && conclContainer) {
    if (!conclusaoUnlocked) {
      conclAcc.style.display = "none";
      conclContainer.innerHTML = "";
    } else {
      conclAcc.style.display = "";
      const section = document.createElement("div");
      section.className = "subsection";

      section.innerHTML = `
        <div class="field field-full">
          <label>Remaining Work e Owners alterados?</label>
          <div class="process-row">
            <div class="toggle-group" data-flag="cardRemainingWorkOk">
              <button type="button" class="toggle-chip no">Não</button>
              <button type="button" class="toggle-chip yes">Sim</button>
            </div>
            <div class="process-status" data-flag-text="cardRemainingWorkOk">
              CARD CONCLUIDO!
            </div>
          </div>
        </div>
      `;

      conclContainer.innerHTML = "";
      conclContainer.appendChild(section);
    }
  }
}

// ----------------- RE-RENDER DOS PROCESSOS PRESERVANDO ABERTOS ---------

function reRenderProcessesForTab(tabId, openIds = []) {
  const tabData = tabsState.tabs[tabId];
  if (!tabData) return;
  renderChannelProcesses(tabId, tabData);

  // reabre os accordions que estavam abertos
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

  // CHECKBOXES
  root.querySelectorAll(".process-checkbox").forEach(input => {
    const channel = input.dataset.channel;
    const key = input.dataset.key;
    input.checked = getCheck(tabData, channel, key);

    input.addEventListener("change", () => {
      const openIds = getOpenAccordionIds();
      setCheck(tabId, channel, key, input.checked);
      reRenderProcessesForTab(tabId, openIds);
    });
  });

  // TOGGLES Sim/Não
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

  // textos "PRONTO PARA QA!", "ENVIAR!", "CANAL CONCLUIDO!", "CARD CONCLUIDO!"
  root.querySelectorAll(".process-status[data-flag-text]").forEach(el => {
    const name = el.dataset.flagText;
    const on = getFlag(tabData, name);
    el.style.display = on ? "block" : "none";
  });
}

/* ---- Função principal de processos (chamada pelo main.js) ---- */

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

  attachProcessHandlers(tabId, tabData);
}
