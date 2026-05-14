// shared/parser.js

export function importarExtratoCSV(inputElement, callback) {
    const arquivo = inputElement.files[0];
    if (!arquivo) return;

    if (!arquivo.name.toLowerCase().endsWith('.csv') && arquivo.type !== 'text/csv') {
        alert("⚠️ ARQUIVO INVÁLIDO detectado!");
        inputElement.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const texto = e.target.result;
        const linhas = texto.split('\n');
        // Motor de Parser Universal
        const linhasVidas = [];
        for (let i = 0; i < linhas.length; i++) {
            const l = linhas[i].trim();
            if (l) {
                if (l.includes('","')) {
                    linhasVidas.push(l.split('","').map(c => c.replace(/^"|"$/g, '').trim()));
                } else if (l.includes(';')) {
                    linhasVidas.push(l.split(';').map(c => c.replace(/^"|"$/g, '').trim()));
                } else if (l.includes(',')) {
                    linhasVidas.push(l.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim()));
                } else {
                    linhasVidas.push(l.split('\t').map(c => c.trim()));
                }
            }
        }

        if (linhasVidas.length === 0) {
            alert("⚠️ Nenhum dado detectado no arquivo!");
            inputElement.value = "";
            return;
        }

        // Tenta achar colunas ativamente olhando o cabeçalho
        let idxData = 0, idxLanc = 1, idxDetalhes = 2, idxValor = 4;
        let achouCabecalho = false;
        let headerLineIdx = -1;

        for (let i = 0; i < Math.min(50, linhasVidas.length); i++) {
            const cols = linhasVidas[i];
            let td = -1, tv = -1, tl = -1, tdet = -1;
            for (let j = 0; j < cols.length; j++) {
                const h = cols[j].toLowerCase();
                if (h.includes('data') || h.includes('date')) td = j;
                else if (h.includes('valor') || h.includes('value') || h.includes('importância') || h.includes('quantia')) tv = j;
                else if (h.includes('lançamento') || h.includes('histórico') || h.includes('historico') || h === 'nome' || h.includes('descri')) tl = j;
                else if (h.includes('detalhes') || h.includes('memo') || h.includes('observação')) tdet = j;
            }
            if (td !== -1 && tv !== -1) {
                idxData = td;
                idxValor = tv;
                idxLanc = tl !== -1 ? tl : (td === 0 ? 1 : 0);
                idxDetalhes = tdet !== -1 ? tdet : idxLanc;
                achouCabecalho = true;
                headerLineIdx = i;
                break;
            }
        }

        if (idxDetalhes >= linhasVidas[0].length) idxDetalhes = idxLanc;

        let totalImportadosSucedidos = 0;
        let itensMesAtual = 0;
        let itensOutrosPeriodos = 0;

        // Tenta achar a verdadeira data referencial do Arquivo
        let searchStart = headerLineIdx !== -1 ? headerLineIdx + 1 : 0;
        let extratoMes = new Date().getMonth();
        let extratoAno = new Date().getFullYear();

        for (let i = searchStart; i < Math.min(searchStart + 50, linhasVidas.length); i++) {
            const cols = linhasVidas[i];
            if (cols.length > Math.max(idxData, idxValor)) {
                let dataStr = cols[idxData] || "";
                let lancStr = cols[idxLanc] ? cols[idxLanc].toUpperCase() : "";

                if (dataStr.includes('/') && !lancStr.includes('SALDO ANTERIOR') && /\d/.test(dataStr)) {
                    const pt = dataStr.replace(/^"|"$/g, '').split('/');
                    if (pt.length >= 2) {
                        extratoMes = parseInt(pt[1], 10) - 1;
                        if (pt.length === 3) {
                            let a = pt[2];
                            extratoAno = parseInt(a.length === 2 ? `20${a}` : a, 10);
                        }
                        break;
                    }
                }
            }
        }

        let linhaInicial = achouCabecalho ? headerLineIdx + 1 : 1;
        let arquivoTemNegativos = false;
        for (let i = linhaInicial; i < linhasVidas.length; i++) {
            if (linhasVidas[i][idxValor] && linhasVidas[i][idxValor].includes('-')) {
                arquivoTemNegativos = true;
                break;
            }
        }

        const registros = [];

        for (let i = linhaInicial; i < linhasVidas.length; i++) {
            const colunas = linhasVidas[i];
            if (colunas.length <= idxValor || colunas.length <= idxData) continue;

            let dataOriginal = colunas[idxData];
            const lancamento = colunas[idxLanc] || "";
            const detalhes = colunas[idxDetalhes] || "";
            const valorStr = colunas[idxValor] || "";

            if (!dataOriginal || !valorStr) continue;

            const lancUpper = lancamento.toUpperCase();
            if (lancUpper.includes('SALDO DO DIA') || lancUpper.replace(/\s/g, '') === 'SALDO') continue;

            let cleanVal = valorStr.replace('R$', '').replace(/\s/g, '').trim();
            if (cleanVal.endsWith('-')) cleanVal = '-' + cleanVal.slice(0, -1);

            if (cleanVal.includes(',') && cleanVal.includes('.')) {
                let lastComma = cleanVal.lastIndexOf(',');
                let lastDot = cleanVal.lastIndexOf('.');
                if (lastComma > lastDot) cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
                else cleanVal = cleanVal.replace(/,/g, '');
            } else if (cleanVal.includes(',')) {
                cleanVal = cleanVal.replace(',', '.');
            }

            let valorNumerico = parseFloat(cleanVal);
            if (isNaN(valorNumerico) || valorNumerico === 0) continue;

            let desc = detalhes;
            let matchFull = detalhes.match(/^(\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+(.+)/);
            if (matchFull) desc = matchFull[3].replace(/^\d+\s+/, '');

            let finalNome = desc && desc !== lancamento ? desc + " - " + lancamento : lancamento;
            if (lancUpper.includes('SALDO ANTERIOR')) {
                finalNome = "Saldo Anterior";
                dataOriginal = `01/${String(extratoMes + 1).padStart(2, '0')}/${extratoAno}`;
            }

            let dataIso = dataOriginal;
            if (dataOriginal.includes('/')) {
                const parts = dataOriginal.split('/');
                if (parts.length === 3) {
                    let ano = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    dataIso = `${ano}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (parts.length === 2) {
                    dataIso = `${new Date().getFullYear()}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            let tipoReal = "Saída";
            const isEntrada = ['SALARIO', 'RECEBID', 'ESTORNO', 'RENDIMENTO', 'TED RECEB', 'PIX RECEB', 'REEMBOLSO', 'SALDO ANTERIOR'].some(k => lancUpper.includes(k));
            if (valorStr.includes('-') || valorStr.includes('D')) tipoReal = "Saída";
            else if (valorStr.includes('+') || valorStr.includes('C') || isEntrada || (arquivoTemNegativos && valorNumerico > 0)) tipoReal = "Entrada";

            registros.push({
                nome: finalNome,
                valor: Math.abs(valorNumerico),
                categoria: categorizarGasto(finalNome),
                data: dataIso,
                tipo: tipoReal
            });
            totalImportadosSucedidos++;
        }

        if (callback) callback({ total: totalImportadosSucedidos, registros, mes: extratoMes, ano: extratoAno });
        inputElement.value = "";
    };

    reader.readAsText(arquivo, 'ISO-8859-1');
}

function categorizarGasto(str) {
    if (!str) return "Geral";
    const s = str.toLowerCase();
    if (s.match(/panificadora|padaria|acai|açaí|restaurante|lanch|burger|pizza|ifood|rappi|mcdonald|food|espetinho|milky|sorvete/)) return "Alimentação";
    if (s.match(/supermercado|mercado|campelo|atacad|hortifruti|atacarejo|mercearia|superbox|feira/)) return "Supermercado";
    if (s.match(/uber|99|combustivel|posto|gasolina|etanol|passagem|transporte/)) return "Transporte";
    if (s.match(/farmacia|drogaria|saude|hospital|medico|unimed|odont/)) return "Saúde";
    if (s.match(/pagseguro|cartao|cartão|fatura|nu pagamentos|valori/)) return "Cartão de Crédito / Serviços";
    if (s.match(/pix - enviado|ted enviado|doc enviado/)) return "Pix / Transferências";
    if (s.match(/netflix|spotify|cinema|lazer|amazon prime/)) return "Lazer";
    if (s.match(/energia|agua|conta|boleto|condominio|internet|celular|vivo|claro|tim/)) return "Contas Residenciais";
    if (s.match(/reembolso|estorno/)) return "Estornos / Reembolsos";
    return "Geral";
}
