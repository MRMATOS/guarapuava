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
    "HORÁRIO", "DE", "LINHA", "PONTOS", "ÚTEIS", "SÁBADOS", "DOMINGOS", "FERIADOS",
    "DIAS", "TABELA", "SUJEITA", "Á", "A", "MODIFICAÇÕES", "DÚVIDAS,", "LIGUE:",
    "3035", "3388", "(42)", "REVISÃO", "DEPARTAMENTO", "TRÁFEGO", "GUARAPUAVA,",
    "RODADA,", "INÍCIO:", "VIADUTO,", "EXECUTADO", "PELA", "ATENDIMENTO", "REALIZADO",
    "CARRO", "EXTRA,", "GARAGEM", "RECOLHE", "PRIMEIRA", "RODADA", "INÍCIO", "NO"
]

func formatarNomePonto(_ raw: String) -> String {
    var cleanedRaw = raw
    cleanedRaw = cleanedRaw.replacingOccurrences(of: #"^[-–\s\d]+[a-zA-Z\s]*Fonte"#, with: "Fonte", options: .regularExpression)
    
    let tokens = cleanedRaw.components(separatedBy: CharacterSet.whitespacesAndNewlines)
        .map { $0.trimmingCharacters(in: CharacterSet.punctuationCharacters.subtracting(CharacterSet(charactersIn: "-/."))) }
        .filter { w in
            let up = w.uppercased()
            if up.isEmpty || palavrasIgnoradas.contains(up) || up.contains(":") { return false }
            if Int(up) != nil { return false }
            return true
        }
    
    var base = tokens.joined(separator: " ").trimmingCharacters(in: .whitespaces)
    if base.isEmpty { return "Ponto de Parada" }
    
    // Normaliza pontos de chegada e saída comuns
    if base.lowercased().contains("fonte") && base.lowercased().contains("chegada") {
        base = "Fonte Chegada"
    }
    if base.lowercased().contains("fonte") && base.lowercased().contains("saída") {
        base = "Saída Fonte"
    }
    
    // Converte para Title Case harmonioso
    let lowercaseWords: Set<String> = ["de", "da", "do", "das", "dos", "e", "em", "via", "para", "x"]
    let formatted = base.lowercased().components(separatedBy: " ").map { w in
        if lowercaseWords.contains(w) { return w }
        if w.count <= 3 && !["rua", "av", "pqa"].contains(w) { return w.uppercased() } // Siglas como UPA, SESC, UTFPR
        return w.prefix(1).uppercased() + w.dropFirst()
    }.joined(separator: " ")
    
    return formatted
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
    
    // Verifica se há separador interno para SÁBADOS
    let sabadoMarker = words.first { $0.text.uppercased().contains("SÁBADO") || $0.text.uppercased().contains("SABADO") }
    let splitY: CGFloat? = sabadoMarker?.vy
    
    // Agrupa colunas por X
    var colClusters: [CGFloat] = []
    for tw in timeWords.sorted(by: { $0.vx < $1.vx }) {
        if !colClusters.contains(where: { abs($0 - tw.vx) < 14 }) {
            colClusters.append(tw.vx)
        }
    }
    colClusters.sort()
    
    var colunas: [ColunaDetectada] = []
    
    for cx in colClusters {
        let timesInCol = timeWords.filter { abs($0.vx - cx) < 16 }
        let maxY = timesInCol.map { $0.vy }.max() ?? 0
        
        // Cabeçalho da coluna: palavras logo acima do maxY dos tempos
        let hWords = words.filter { abs($0.vx - cx) < 22 && $0.vy > maxY && $0.vy < maxY + 110 }
            .sorted(by: { $0.vy > $1.vy })
            .map { $0.text }
            .joined(separator: " ")
        
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
