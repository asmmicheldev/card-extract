// js/parsers.js

// ---- Divisão 1: título do card ----
export function parseTitulo(linhas) {
  let tituloLinha = "";
  let cardUrl = "";
  let firstNonEmptySeen = false;

  for (const l of linhas) {
    const t = l.trim();
    if (!t) continue;

    if (!firstNonEmptySeen) {
      tituloLinha = t;
      firstNonEmptySeen = true;
    } else if (!cardUrl && t.startsWith("http")) {
      cardUrl = t;
      break;
    }
  }

  let nome = "";
  let desc = "";

  if (tituloLinha) {
    const partes = tituloLinha.split(" - ");
    if (partes.length >= 3) {
      // XP - CODIGO - Descrição...
      nome = partes[1].trim();
      desc = partes.slice(2).join(" - ").trim();
    } else if (partes.length === 2) {
      // RICO - CODIGO   |   CLEAR - CODIGO
      nome = partes[1].trim();
      desc = partes[1].trim();
    } else {
      nome = tituloLinha.trim();
      desc = "";
    }
  }

  return {
    nome,
    descricao: desc,
    cardUrl,
    tituloCompleto: tituloLinha || ""
  };
}

// ---- Divisão 2: Informações Gerais ----
export function parseInformacoesGerais(linhas) {
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
export function parseDados(linhas) {
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

// ========== PARSE DE COMUNICAÇÕES ==========

export function splitCommunications(linhas) {
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
        tipo = match[3].trim().toUpperCase();
      }

      blocks.push({ header, numero, posicao, tipo, lines: subset });
      i = j - 1;
    }
  }
  return blocks;
}

// ---- Push ----
export function parsePushBlock(subset) {
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

// ---- Banner ----
export function parseBannerBlock(subset) {
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

// ---- MktScreen ----

export function parseMktBloco(blocoLines) {
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

export function parseMktScreenBlock(subset) {
  let posicaoJornada = "";
  let url = "";
  let blocosQtd = "";
  let nomeExpMacro = "";
  let channel = "";
  const blocos = [];

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

// ---- Junta tudo ----
export function parseCommunications(linhas) {
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
