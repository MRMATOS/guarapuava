import Foundation
import PDFKit

// MARK: - Models

struct PontoItinerarioDTO: Codable {
    let id: String
    let nome: String
    let ordem: Int
    var horariosUteis: [String]
    var horariosSabado: [String]
    var horariosDomingo: [String]
}

struct LinhaBairroDTO: Codable {
    let id: String
    let codigo: String
    let bairro: String
    let nomeExibicao: String
    let tipo: String // "regular" | "interbairros"
    var pontos: [PontoItinerarioDTO]
    var observacoes: [String]
}

struct DadosHorariosOnibusDTO: Codable {
    let dataExtracao: String
    let totalLinhas: Int
    let linhas: [LinhaBairroDTO]
}

// MARK: - Visual Word Extractor

struct VisualWord {
    let text: String
    let vx: CGFloat
    let vy: CGFloat
    let vw: CGFloat
    let vh: CGFloat
}

func extrairPalavrasVisuais(page: PDFPage) -> [VisualWord] {
    guard let str = page.string else { return [] }
    let nsStr = str as NSString
    let bounds = page.bounds(for: .mediaBox)
    let rot = page.rotation
    
    let regex = try! NSRegularExpression(pattern: #"(\S+)"#)
    let matches = regex.matches(in: str, range: NSRange(location: 0, length: str.count))
    var words: [VisualWord] = []
    
    for m in matches {
        if let sel = page.selection(for: m.range) {
            let b = sel.bounds(for: page)
            let t = nsStr.substring(with: m.range)
            var vx = b.origin.x
            var vy = b.origin.y
            var vw = b.size.width
            var vh = b.size.height
            if rot == 90 {
                vx = b.origin.y
                vy = bounds.size.width - (b.origin.x + b.size.width)
                vw = b.size.height
                vh = b.size.width
            }
            words.append(VisualWord(text: t, vx: vx, vy: vy, vw: vw, vh: vh))
        }
    }
    return words
}

// MARK: - Limpeza de Cabeçalho do Ponto

let palavrasIgnoradas: Set<String> = [
    "HORÁRIO", "LINHA", "PONTOS", "ÚTEIS", "SÁBADOS", "DOMINGOS", "FERIADOS",
    "DIAS", "TABELA", "SUJEITA", "MODIFICAÇÕES", "DÚVIDAS,", "LIGUE:",
    "3035", "3388", "(42)", "REVISÃO", "DEPARTAMENTO", "TRÁFEGO", "GUARAPUAVA,",
    "RODADA,", "INÍCIO:", "VIADUTO,", "EXECUTADO", "PELA", "ATENDIMENTO", "REALIZADO",
    "CARRO", "EXTRA,", "GARAGEM", "RECOLHE", "PRIMEIRA", "RODADA", "INÍCIO"
]

func formatarNomePonto(_ raw: String) -> String {
    var cleanedRaw = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    cleanedRaw = cleanedRaw.replacingOccurrences(of: #"^[-–—\s]+|^\d+-\s*"#, with: "", options: .regularExpression)
    
    // Remove notas de rodapé / observações que se misturaram no cabeçalho
    if cleanedRaw.contains("PRIMEIRA RODADA") || cleanedRaw.contains("RODADA,") || cleanedRaw.contains("INÍCIO:") {
        cleanedRaw = cleanedRaw.replacingOccurrences(of: #"PRIMEIRA RODADA.*"#, with: "", options: .regularExpression)
        cleanedRaw = cleanedRaw.replacingOccurrences(of: #"RODADA,.*"#, with: "", options: .regularExpression)
        cleanedRaw = cleanedRaw.replacingOccurrences(of: #"INÍCIO:.*"#, with: "", options: .regularExpression)
    }
    
    let tokens = cleanedRaw.components(separatedBy: CharacterSet.whitespacesAndNewlines)
        .map { $0.trimmingCharacters(in: CharacterSet.punctuationCharacters.subtracting(CharacterSet(charactersIn: "-/."))) }
        .filter { w in
            let up = w.uppercased()
            if up.isEmpty || palavrasIgnoradas.contains(up) || up.contains(":") { return false }
            if Int(up) != nil { return false }
            return true
        }
    
    let base = tokens.joined(separator: " ").trimmingCharacters(in: .whitespaces)
    if base.isEmpty { return "Ponto de Parada" }
    
    // Normalizações de Saída/Chegada
    if base.lowercased().contains("fonte") && base.lowercased().contains("saída") {
        return "Fonte Saída"
    }
    if base.lowercased().contains("fonte") && base.lowercased().contains("chegada") {
        return "Fonte Chegada"
    }
    if base.uppercased() == "SAÍDA FONTE" || base.uppercased() == "FONTE SAÍDA" { return "Fonte Saída" }
    if base.uppercased() == "CHEGADA FONTE" || base.uppercased() == "FONTE CHEGADA" { return "Fonte Chegada" }
    
    // Casos específicos solicitados
    if base.lowercased().contains("bar do fumaça") { return "Bar do Fumaça" }
    if base.lowercased().contains("hiper") { return "Hiper (Super Muffato)" }
    if base.lowercased().contains("campo do grêmio") || base.lowercased() == "do grêmio" { return "Campo do Grêmio" }
    if base.lowercased().contains("campo do batel") { return "Campo do Batel" }
    if base.lowercased().contains("pe. chagas") || base.lowercased().contains("padre chagas") { return "Núcleo Padre Chagas" }
    if base.lowercased().contains("praça da prefeitura") || base.lowercased().contains("praça prefeitura") { return "Praça da Prefeitura" }
    if base.lowercased().contains("cerejeiras") { return "Bairru das Cerejeiras" }
    if base.lowercased().contains("crianças") { return "Parque das Crianças" }
    if base == "Trevo PR PR" { return "Trevo PR" }
    
    let lowercaseWords: Set<String> = ["de", "da", "do", "das", "dos", "e", "em", "via", "para", "x", "na", "ao", "ida"]
    let notAcronyms: Set<String> = ["rua", "av", "pqa", "são", "sao", "dal", "dom", "ruy", "rui", "ana", "paz", "bem", "bar", "bom", "mãe", "mae", "ter", "rei", "cia", "mix", "boa", "fé", "fe", "san", "gra", "sol", "box", "big", "spa", "med"]
    
    let formatted = base.lowercased().components(separatedBy: " ").map { w in
        if lowercaseWords.contains(w) { return w }
        if w.count <= 3 && !notAcronyms.contains(w) { return w.uppercased() }
        return w.prefix(1).uppercased() + w.dropFirst()
    }.joined(separator: " ")
    
    var finalResult = formatted
    finalResult = finalResult.replacingOccurrences(of: #"\bTrevo PR PR\b"#, with: "Trevo PR", options: .regularExpression)
    finalResult = finalResult.replacingOccurrences(of: #"\bSaída Fonte\b"#, with: "Fonte Saída")
    finalResult = finalResult.replacingOccurrences(of: #"^[-–—\s]+"#, with: "", options: .regularExpression)
    
    return finalResult
}

func gerarPontoId(_ nome: String) -> String {
    let clean = nome.folding(options: .diacriticInsensitive, locale: .current)
        .lowercased()
        .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
        .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    return clean.isEmpty ? "ponto" : clean
}

// MARK: - Processamento de um PDF para Pontos e Horários

struct ColunaDetectada {
    let nomePonto: String
    let x: CGFloat
    let horariosUteis: [String]
    let horariosSabado: [String]
    let horariosDomingo: [String]
}

func extrairColunas(page: PDFPage, categoriaPrincipal: String) -> [ColunaDetectada] {
    let words = extrairPalavrasVisuais(page: page)
    let timeRegex = try! NSRegularExpression(pattern: #"^[0-2][0-9]:[0-5][0-9]$"#)
    let timeWords = words.filter { timeRegex.firstMatch(in: $0.text, range: NSRange(location: 0, length: $0.text.count)) != nil }
    if timeWords.isEmpty { return [] }
    
    // Topmost row of times
    let topTimeY = timeWords.map { $0.vy }.max() ?? 0
    let topTimes = timeWords.filter { topTimeY - $0.vy < 80 }
    
    // Verifica se há separador interno para SÁBADOS
    let sabadoMarker = words.first { $0.text.uppercased().contains("SÁBADO") || $0.text.uppercased().contains("SABADO") }
    let splitY: CGFloat? = sabadoMarker?.vy
    
    // Agrupa colunas por X
    var colClusters: [CGFloat] = []
    for tw in topTimes.sorted(by: { $0.vx < $1.vx }) {
        if !colClusters.contains(where: { abs($0 - tw.vx) < 14 }) {
            colClusters.append(tw.vx)
        }
    }
    colClusters.sort()
    if colClusters.isEmpty { return [] }
    
    // Identifica linhas horizontais de texto acima dos tempos
    var linesAbove: [(y: CGFloat, words: [VisualWord])] = []
    let aboveWords = words.filter { $0.vy > topTimeY }.sorted(by: { $0.vy < $1.vy })
    for w in aboveWords {
        if let idx = linesAbove.firstIndex(where: { abs($0.y - w.vy) < 3.5 }) {
            linesAbove[idx].words.append(w)
        } else {
            linesAbove.append((y: w.vy, words: [w]))
        }
    }
    
    // Filtra linhas de cabeçalho evitando títulos da linha e cabeçalhos gerais
    var headerWordsList: [VisualWord] = []
    for line in linesAbove {
        let textJoined = line.words.map { $0.text.uppercased() }.joined(separator: " ")
        let isTitleLine = textJoined.contains("HORÁRIO") ||
            textJoined.contains("LINHA ") ||
            textJoined.contains("LIVRO") ||
            textJoined.contains("TABELA") ||
            textJoined.contains("REVISÃO") ||
            textJoined.contains("INTERBAIRROS") ||
            (line.words.first?.text.range(of: #"^\d{1,2}\b"#, options: .regularExpression) != nil && textJoined.contains("-"))
        
        let dist = line.y - topTimeY
        if !isTitleLine && dist <= 28.5 {
            headerWordsList.append(contentsOf: line.words.filter { !$0.text.uppercased().contains("PONTOS") })
        }
    }
    
    var colunas: [ColunaDetectada] = []
    
    for (i, cx) in colClusters.enumerated() {
        let timesInCol = timeWords.filter { abs($0.vx - cx) < 16 }
        
        let leftBound = i == 0 ? (colClusters[0] - 25) : (colClusters[i-1] + cx) / 2
        let rightBound = i == colClusters.count - 1 ? (cx + 25) : (cx + colClusters[i+1]) / 2
        
        let cellWords = headerWordsList.filter { w in
            let midX = w.vx + w.vw / 2
            return midX >= leftBound && midX < rightBound
        }
        
        let sortedCellWords = cellWords.sorted {
            if abs($0.vy - $1.vy) > 3 {
                return $0.vy > $1.vy
            }
            return $0.vx < $1.vx
        }
        let hWords = sortedCellWords.map { $0.text }.joined(separator: " ")
        let nomeLimpo = formatarNomePonto(hWords)
        
        var uteis: [String] = []
        var sabados: [String] = []
        var domingos: [String] = []
        
        for tw in timesInCol {
            let hora = tw.text
            if let split = splitY {
                if tw.vy < split {
                    sabados.append(hora)
                } else {
                    uteis.append(hora)
                }
            } else {
                if categoriaPrincipal == "sabados" {
                    sabados.append(hora)
                } else if categoriaPrincipal == "domingos_feriados" {
                    domingos.append(hora)
                } else {
                    uteis.append(hora)
                }
            }
        }
        
        colunas.append(ColunaDetectada(
            nomePonto: nomeLimpo,
            x: cx,
            horariosUteis: Array(Set(uteis)).sorted(),
            horariosSabado: Array(Set(sabados)).sorted(),
            horariosDomingo: Array(Set(domingos)).sorted()
        ))
    }
    
    return colunas
}

// MARK: - Pipeline Principal

let cacheDir = URL(fileURLWithPath: "/tmp/perola_pdf_cache")
let htmlPath = "/Users/rodrigomatos/.gemini/antigravity-ide/brain/edc14f0a-9b1d-4b81-9fa9-25160058b352/.system_generated/steps/7/content.md"

struct ItemSite {
    let categoria: String
    let nome: String
    let url: String
    let arquivo: String
}

func carregarItensSite() -> [ItemSite] {
    guard let conteudo = try? String(contentsOfFile: htmlPath, encoding: .utf8) else { return [] }
    var itens: [ItemSite] = []
    var cat = "dias_uteis"
    
    let regexHref = try! NSRegularExpression(pattern: #"<a[^>]*href=\"([^\"]+\.pdf)\"[^>]*>(.*?)</a>"#, options: [.caseInsensitive])
    let regexTag = try! NSRegularExpression(pattern: #"<[^>]+>"#)
    
    for linha in conteudo.components(separatedBy: "\n") {
        if linha.contains("Horários Domingos e Feriados") { cat = "domingos_feriados" }
        else if linha.contains("Horários Sábados") { cat = "sabados" }
        else if linha.contains("Horários Dias Úteis") { cat = "dias_uteis" }
        
        let nsLinha = linha as NSString
        let matches = regexHref.matches(in: linha, range: NSRange(linha.startIndex..., in: linha))
        for m in matches {
            let url = nsLinha.substring(with: m.range(at: 1))
            var nome = nsLinha.substring(with: m.range(at: 2))
            nome = regexTag.stringByReplacingMatches(in: nome, range: NSRange(nome.startIndex..., in: nome), withTemplate: "")
                .replacingOccurrences(of: "&nbsp;", with: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let file = URL(string: url)?.lastPathComponent ?? ""
            if !file.isEmpty {
                itens.append(ItemSite(categoria: cat, nome: nome, url: url, arquivo: file))
            }
        }
    }
    return itens
}

let itensSite = carregarItensSite()
print("Itens carregados do site:", itensSite.count)

// Agrupa por Linha / Bairro
// Extrai código numérico
func extrairCodigoENome(_ raw: String) -> (codigo: String, nomeBairro: String, tipo: String) {
    let clean = raw.trimmingCharacters(in: .whitespaces)
    let isInter = clean.lowercased().contains("interbairros")
    let numRegex = try! NSRegularExpression(pattern: #"(\d{1,3})"#)
    var cod = "01"
    if let m = numRegex.firstMatch(in: clean, range: NSRange(clean.startIndex..., in: clean)) {
        let numStr = (clean as NSString).substring(with: m.range)
        if let num = Int(numStr) {
            cod = String(format: "%02d", num)
        }
    }
    
    // Nome do bairro
    var nome = clean
    nome = nome.replacingOccurrences(of: #"^\d+\s*[-]?\s*"#, with: "", options: .regularExpression)
    nome = nome.replacingOccurrences(of: "Interbairros", with: "", options: .caseInsensitive)
    nome = nome.trimmingCharacters(in: CharacterSet.whitespaces.union(CharacterSet(charactersIn: "-")))
    if nome.isEmpty { nome = isInter ? "Interbairros \(cod)" : "Linha \(cod)" }
    
    return (cod, nome, isInter ? "interbairros" : "regular")
}

var linhasMap: [String: LinhaBairroDTO] = [:]

for item in itensSite {
    let localFile = cacheDir.appendingPathComponent(item.arquivo)
    guard let doc = PDFDocument(url: localFile), let page = doc.page(at: 0) else { continue }
    
    let info = extrairCodigoENome(item.nome)
    let linhaId = info.tipo == "interbairros" ? "interbairros-\(info.codigo)" : "linha-\(info.codigo)"
    let nomeExibicao = info.tipo == "interbairros" ? "Linha Interbairros \(info.codigo)" : "Linha \(info.codigo) - \(info.nomeBairro)"
    
    let colunas = extrairColunas(page: page, categoriaPrincipal: item.categoria)
    
    var linhaExistente = linhasMap[linhaId] ?? LinhaBairroDTO(
        id: linhaId,
        codigo: info.codigo,
        bairro: info.nomeBairro,
        nomeExibicao: nomeExibicao,
        tipo: info.tipo,
        pontos: [],
        observacoes: []
    )
    
    // Mescla colunas nos pontos da linha
    for col in colunas {
        let pId = gerarPontoId(col.nomePonto)
        if let idx = linhaExistente.pontos.firstIndex(where: { $0.id == pId || $0.nome == col.nomePonto }) {
            var p = linhaExistente.pontos[idx]
            p.horariosUteis = Array(Set(p.horariosUteis + col.horariosUteis)).sorted()
            p.horariosSabado = Array(Set(p.horariosSabado + col.horariosSabado)).sorted()
            p.horariosDomingo = Array(Set(p.horariosDomingo + col.horariosDomingo)).sorted()
            linhaExistente.pontos[idx] = p
        } else {
            let novoPonto = PontoItinerarioDTO(
                id: pId,
                nome: col.nomePonto,
                ordem: linhaExistente.pontos.count + 1,
                horariosUteis: col.horariosUteis,
                horariosSabado: col.horariosSabado,
                horariosDomingo: col.horariosDomingo
            )
            linhaExistente.pontos.append(novoPonto)
        }
    }
    
    linhasMap[linhaId] = linhaExistente
}

// Ordena linhas alfabeticamente por bairro / nome de exibição
var linhasOrdenadas = Array(linhasMap.values).sorted { $0.bairro.localizedCaseInsensitiveCompare($1.bairro) == .orderedAscending }

print("Total Linhas processadas:", linhasOrdenadas.count)

let isoFormatter = ISO8601DateFormatter()
let resultado = DadosHorariosOnibusDTO(
    dataExtracao: isoFormatter.string(from: Date()),
    totalLinhas: linhasOrdenadas.count,
    linhas: linhasOrdenadas
)

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
if let data = try? encoder.encode(resultado) {
    let outPath1 = "/Users/rodrigomatos/Documents/guarapuava/src/data/horarios-onibus.json"
    let outPath2 = "/Users/rodrigomatos/Documents/guarapuava/public/data/horarios-onibus.json"
    let outPath3 = "/Users/rodrigomatos/Documents/guarapuava/horarios-onibus.json"
    
    try? data.write(to: URL(fileURLWithPath: outPath1))
    try? data.write(to: URL(fileURLWithPath: outPath2))
    try? data.write(to: URL(fileURLWithPath: outPath3))
    print("Salvo com sucesso em src/data/horarios-onibus.json (\(data.count) bytes)")
} else {
    print("Erro ao codificar JSON")
}
