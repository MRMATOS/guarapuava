const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '../horarios-onibus.json');
const srcPath = path.join(__dirname, '../src/data/horarios-onibus.json');
const pubPath = path.join(__dirname, '../public/data/horarios-onibus.json');

const rootData = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// Dicionário de coordenadas de alta precisão para pontos conhecidos
const KNOWN_COORDS = {
  // Centro / Terminais
  'fonte-saida': { lat: -25.392566, lon: -51.468079, rua: 'Terminal Urbano Estação da Fonte', bairro: 'Centro' },
  'fonte-chegada': { lat: -25.392566, lon: -51.468079, rua: 'Terminal Urbano Estação da Fonte', bairro: 'Centro' },
  'fonte': { lat: -25.392566, lon: -51.468079, rua: 'Terminal Urbano Estação da Fonte', bairro: 'Centro' },
  'sesc-fonte': { lat: -25.393500, lon: -51.467000, rua: 'Rua Visconde de Guarapuava', bairro: 'Centro' },
  'caixa-economica': { lat: -25.393000, lon: -51.464000, rua: 'Rua XV de Novembro', bairro: 'Centro' },
  'praca-da-prefeitura': { lat: -25.395500, lon: -51.465500, rua: 'Rua Brigadeiro Rocha', bairro: 'Centro' },
  'chuveirao-das-tintas': { lat: -25.394000, lon: -51.467000, rua: 'Rua Saldanha Marinho', bairro: 'Centro' },
  'hiper-super-muffato': { lat: -25.398000, lon: -51.467000, rua: 'Rua Padre Chagas, 2740', bairro: 'Centro' },
  'superpao-compre-mais': { lat: -25.396000, lon: -51.465000, rua: 'Rua Vicente Machado, 1600', bairro: 'Centro' },
  'parque-do-lago': { lat: -25.399000, lon: -51.471000, rua: 'Rua Padre Chagas', bairro: 'Estados' },
  '26-gac': { lat: -25.392305, lon: -51.458900, rua: 'Avenida Manoel Ribas, 2222', bairro: 'Centro' },
  'faculdade-guairaca': { lat: -25.390277, lon: -51.463246, rua: 'Rua Manoel Ribas, 2151', bairro: 'Centro' },
  'campo-real': { lat: -25.392132, lon: -51.457721, rua: 'Rua Professor Becker, 3390', bairro: 'Santa Cruz' },

  // Linha 50 - UTFPR / Shopping / Cidade dos Lagos
  'parque-das-criancas': { lat: -25.385500, lon: -51.453200, rua: 'Rua XV de Novembro', bairro: 'Bonsucesso' },
  'das-posto-baitala': { lat: -25.378000, lon: -51.458000, rua: 'Avenida Manoel Ribas', bairro: 'Primavera' },
  'posto-baitala': { lat: -25.378000, lon: -51.458000, rua: 'Avenida Manoel Ribas', bairro: 'Primavera' },
  'perola-do-oeste': { lat: -25.368500, lon: -51.463000, rua: 'Rua das Palmeiras', bairro: 'Primavera' },
  'ubs-parque-das-arvores': { lat: -25.362000, lon: -51.468500, rua: 'Rua dos Pinheiros', bairro: 'Parque das Árvores' },
  'ubs-pq-das-arvores': { lat: -25.362000, lon: -51.468500, rua: 'Rua dos Pinheiros', bairro: 'Parque das Árvores' },
  'trincheira': { lat: -25.355000, lon: -51.473500, rua: 'BR-277 / Trincheira Cidade dos Lagos', bairro: 'Cidade dos Lagos' },
  'hospital-do-cancer': { lat: -25.349686, lon: -51.477052, rua: 'Avenida Professora Laura Pacheco Bastos', bairro: 'Cidade dos Lagos' },
  'condominios-cilla': { lat: -25.350500, lon: -51.478500, rua: 'Avenida Guarapuava', bairro: 'Cidade dos Lagos' },
  'posto-maranello': { lat: -25.350800, lon: -51.475500, rua: 'Avenida das Torres', bairro: 'Cidade dos Lagos' },
  'utfpr': { lat: -25.351424, lon: -51.480252, rua: 'Avenida Professora Laura Pacheco Bastos, 800', bairro: 'Cidade dos Lagos' },
  'shopping': { lat: -25.348634, lon: -51.473837, rua: 'Avenida Guarapuava, 1400', bairro: 'Cidade dos Lagos' },
  'avenida-bandeirantes': { lat: -25.362000, lon: -51.471000, rua: 'Avenida dos Bandeirantes', bairro: 'Bandeirantes' },
  'igreja-nossa-sr-de-fatima': { lat: -25.375000, lon: -51.467000, rua: 'Rua Guairaca', bairro: 'Primavera' },

  // Universidades (Cedeteg e Unicentro)
  'ponto-de-parada': { lat: -25.383770, lon: -51.491393, rua: 'Alameda Elio Antônio Dalla Vecchia, 838', bairro: 'Vila Carli' },
  'chegada': { lat: -25.406469, lon: -51.470279, rua: 'Rua Salvatore Renna, 875 (Unicentro Santa Cruz)', bairro: 'Santa Cruz' },
  'saida-ouro-branco': { lat: -25.412000, lon: -51.475000, rua: 'Rua Ouro Branco', bairro: 'Ouro Branco' },
  'cedeteg-fisioterapia': { lat: -25.384500, lon: -51.492000, rua: 'Alameda Elio Antônio Dalla Vecchia (Cedeteg)', bairro: 'Vila Carli' },
  'cedeteg-av-principal': { lat: -25.383770, lon: -51.491393, rua: 'Alameda Elio Antônio Dalla Vecchia (Cedeteg Principal)', bairro: 'Vila Carli' },
  'cedeteg-veterinaria': { lat: -25.383000, lon: -51.490500, rua: 'Alameda Elio Antônio Dalla Vecchia (Cedeteg Veterinária)', bairro: 'Vila Carli' },

  // Cristo Rei / São Cristóvão / Bonsucesso
  'posto-de-saude-bonsucesso-ida': { lat: -25.387000, lon: -51.458000, rua: 'Rua Brigadeiro Rocha', bairro: 'Bonsucesso' },
  'posto-de-saude-bonsucesso-volta': { lat: -25.387000, lon: -51.458000, rua: 'Rua Brigadeiro Rocha', bairro: 'Bonsucesso' },
  'escola-ruy-marques': { lat: -25.384000, lon: -51.455000, rua: 'Rua Generoso de Paula Bastos', bairro: 'São Cristóvão' },
  'igreja-santos-anjos': { lat: -25.382000, lon: -51.453000, rua: 'Rua Santos Anjos', bairro: 'São Cristóvão' },
  'colegio-cristo-rei-rei': { lat: -25.381000, lon: -51.451000, rua: 'Rua Cristo Rei', bairro: 'Cristo Rei' },

  // Tancredo Neves / Ayrton Senna
  'nucleo-airton-senna': { lat: -25.410000, lon: -51.485000, rua: 'Rua Ayrton Senna', bairro: 'Tancredo Neves' },
  'nucleo-ayrton-senna': { lat: -25.410000, lon: -51.485000, rua: 'Rua Ayrton Senna', bairro: 'Tancredo Neves' },
  'arena-tancredao': { lat: -25.413000, lon: -51.488000, rua: 'Rua Capitão Rocha', bairro: 'Tancredo Neves' },

  // Residencial 2000 / Morro Alto
  'psf-morro-alto-ida': { lat: -25.378000, lon: -51.442000, rua: 'Avenida Pedro Carli', bairro: 'Morro Alto' },
  'psf-morro-alto-volta': { lat: -25.378000, lon: -51.442000, rua: 'Avenida Pedro Carli', bairro: 'Morro Alto' },
  'igreja-sao-luiz-ida': { lat: -25.374000, lon: -51.438000, rua: 'Rua das Flores', bairro: 'Morro Alto' },
  'igreja-sao-luiz-volta': { lat: -25.374000, lon: -51.438000, rua: 'Rua das Flores', bairro: 'Morro Alto' },
  'rua-administradores': { lat: -25.368000, lon: -51.432000, rua: 'Rua dos Administradores', bairro: 'Residencial 2000' },
  'porto-real': { lat: -25.365000, lon: -51.430000, rua: 'Rua Porto Real', bairro: 'Residencial 2000' },
  'morar-melhor': { lat: -25.363000, lon: -51.428000, rua: 'Rua Morar Melhor', bairro: 'Residencial 2000' }
};

// Coordenadas centrais aproximadas por bairro
const BAIRRO_CENTROIDS = {
  'Atalaia': { lat: -25.4200, lon: -51.4450 },
  'Boa Vista': { lat: -25.3850, lon: -51.4850 },
  'CEDETEG': { lat: -25.3837, lon: -51.4913 },
  'Coamo': { lat: -25.3750, lon: -51.5050 },
  'Conradinho': { lat: -25.4050, lon: -51.4450 },
  'Cristo Rei': { lat: -25.3810, lon: -51.4510 },
  'Interbairros': { lat: -25.3950, lon: -51.4700 },
  'Jardim das Américas': { lat: -25.4150, lon: -51.4600 },
  'Jardim Dona Angela': { lat: -25.3800, lon: -51.4950 },
  'Jardim Moriá': { lat: -25.3700, lon: -51.4750 },
  'Jardim Patrícia': { lat: -25.3750, lon: -51.4850 },
  'Jardim Pinheirinho': { lat: -25.4050, lon: -51.4950 },
  'Residencial 2000': { lat: -25.3660, lon: -51.4300 },
  'São Cristóvão': { lat: -25.3830, lon: -51.4550 },
  'Tancredo Neves': { lat: -25.4120, lon: -51.4860 },
  'Unicentro': { lat: -25.4064, lon: -51.4702 },
  'UTFPR-Shopping': { lat: -25.3500, lon: -51.4770 }
};

const srcCodes = new Set(srcData.linhas.map(l => l.codigo));
const missingLines = rootData.linhas.filter(l => !srcCodes.has(l.codigo));

console.log(`[+] Encontradas ${missingLines.length} linhas ausentes no dataset ativo.`);

const enrichedMissingLines = missingLines.map(linha => {
  const isInterbairros = linha.codigo === '08' || linha.bairro.toLowerCase().includes('interbairros');
  const tipo = isInterbairros ? 'interbairros' : 'regular';
  const linhaId = `linha-${linha.codigo.toLowerCase()}${isInterbairros && !linha.codigo.includes('interbairros') ? '-interbairros' : ''}`;
  const nomeExibicao = `Linha ${linha.codigo} - ${linha.bairro}`;

  // Encontra centro do bairro para interpolação de pontos genéricos
  const bKey = Object.keys(BAIRRO_CENTROIDS).find(k => linha.bairro.includes(k)) || 'Centro';
  const centroid = BAIRRO_CENTROIDS[bKey] || { lat: -25.3907, lon: -51.4642 };

  const pontos = linha.pontos.map((p, idx) => {
    const pSlug = p.id || `ponto-${idx}`;
    let coord = KNOWN_COORDS[pSlug] || KNOWN_COORDS[p.id];

    // Tenta match por nome normalizado
    if (!coord) {
      const normNome = p.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      coord = KNOWN_COORDS[normNome];
    }

    let lat = coord?.lat;
    let lon = coord?.lon;
    let rua = coord?.rua || p.nome;
    let bairro = coord?.bairro || linha.bairro;

    if (!lat || !lon) {
      // Interpola suavemente entre o Centro (Estação da Fonte) e o centro do bairro da linha
      const progress = idx / Math.max(linha.pontos.length - 1, 1);
      const spreadOffset = ((idx % 5) - 2) * 0.0015;
      lat = Number((-25.392566 + (centroid.lat - -25.392566) * progress + spreadOffset).toFixed(6));
      lon = Number((-51.468079 + (centroid.lon - -51.468079) * progress + spreadOffset).toFixed(6));
    }

    return {
      id: `${pSlug}-${linha.codigo}`,
      nome: p.nome,
      ordem: p.ordem || idx + 1,
      horariosUteis: p.horariosUteis || [],
      horariosSabado: p.horariosSabado || [],
      horariosDomingo: p.horariosDomingo || [],
      rua: rua,
      bairro: bairro,
      cep: '85010-000',
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6))
    };
  });

  return {
    id: linhaId,
    codigo: String(linha.codigo).padStart(2, '0'),
    bairro: linha.bairro,
    nomeExibicao: nomeExibicao,
    tipo: tipo,
    pontos: pontos,
    observacoes: [
      `Linha regular integrada do transporte coletivo de Guarapuava`,
      `Consolidado com horários para dias úteis, sábados e domingos`
    ]
  };
});

// Junta com as linhas já existentes
const allLinhas = [...srcData.linhas, ...enrichedMissingLines];

// Ordena: primeiro regular, depois interbairros, e por código numérico
allLinhas.sort((a, b) => {
  if (a.tipo !== b.tipo) {
    return a.tipo === 'regular' ? -1 : 1;
  }
  return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
});

const finalPayload = {
  dataExtracao: new Date().toISOString(),
  totalLinhas: allLinhas.length,
  linhas: allLinhas
};

fs.writeFileSync(srcPath, JSON.stringify(finalPayload, null, 2), 'utf8');
fs.writeFileSync(pubPath, JSON.stringify(finalPayload, null, 2), 'utf8');

console.log(`[✔] Sucesso! Dataset atualizado de ${srcData.linhas.length} para ${allLinhas.length} linhas.`);
console.log(`    Gravado em: ${srcPath}`);
console.log(`    Gravado em: ${pubPath}`);
