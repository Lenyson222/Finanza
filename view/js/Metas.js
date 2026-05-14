import { renderHeader, parseNumber, validarAcesso } from '../shared/header.js';



window.dados = {
    metas: [],
    despesas: [],
    mesVisualizacao: new Date().getMonth(),
    anoVisualizacao: new Date().getFullYear(),
};

let sobraAtual = 0;

async function inicializarMetas() {
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;
    // Tentar carregar Metas salvas no Storage (simulando BD próprio para as Metas se LocalStorage)
    const localMetas = localStorage.getItem("FinanzaMetas");
    if(localMetas) {
        try {
            window.dados.metas = JSON.parse(localMetas) || [];
        } catch(e) {}
    }

    // Calcular Sobra Atual a partir do DB Principal
    if (typeof window.buscarItens === 'function') {
        const itens = await window.buscarItens();
        if (itens && itens.length > 0) window.dados.despesas = itens;
    }

    calcularSobraBase();
    window.renderMetas();
}

function calcularSobraBase() {
    const mesAtual = window.dados.mesVisualizacao;
    const anoAtual = window.dados.anoVisualizacao;

    let totalEntradas = 0;
    let totalSaidas = 0;
    let vazamentoSOS = 0;

    window.dados.despesas.forEach(d => {
        if (!d.data) return;
        const dData = new Date(d.data + "T12:00:00");
        if (dData.getMonth() === mesAtual && dData.getFullYear() === anoAtual) {
            const val = parseNumber(d.valor) || 0;
            if (d.tipo === "Entrada") {
                totalEntradas += val;
            } else {
                totalSaidas += val;
            }
        }
    });

    try {
        const salvoSOS = localStorage.getItem("FinanzaSOS");
        if (salvoSOS) {
            const parseS = JSON.parse(salvoSOS);
            if (parseS && parseS.calc) {
                const divida = parseFloat(parseS.calc.divida) || 0;
                const juros = parseFloat(parseS.calc.juros) || 0;
                const futil = parseFloat(parseS.calc.futilidades) || 0;
                vazamentoSOS = (divida * (juros/100)) + futil;
            }
        }
    } catch(e) {}

    sobraAtual = totalEntradas - totalSaidas - vazamentoSOS;
    const rs = document.getElementById('resultado-sobra-metas');
    if (rs) {
        if (sobraAtual < 0) {
            rs.className = "sidebar-big-num text-red";
            rs.textContent = "Sem Sobra";
        } else {
            rs.className = "sidebar-big-num text-green";
            rs.textContent = sobraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }
}

window.renderMetas = function () {
    const listaMetas = document.getElementById('lista-metas');
    if (listaMetas) {
        listaMetas.innerHTML = window.dados.metas.map((m, i) => `
            <div class="meta-item" style="padding: 22px;">
                <div class="meta-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <input type="text" value="${m.nome}" onchange="window.atualizarMetaNome(${i}, this.value)" placeholder="Nome da Meta" style="background: transparent; border: none; border-bottom: 1px dashed var(--border-light); color: var(--text-main); font-weight: 700; font-size: 16px; outline: none; flex: 1; margin-right: 15px; font-family: inherit; padding-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span id="txt-${i}" class="text-blue strong-value">R$ 0,00</span>
                        <button type="button" class="btn-delete" onclick="window.deletarMeta(${i})" title="Excluir Meta" style="position: static; margin: 0; padding: 4px 8px;">✖</button>
                    </div>
                </div>
                <label class="uppercase-label text-muted">Aporte Mensal (% da sobra total - R$ ${sobraAtual > 0 ? sobraAtual.toFixed(2) : '0'})</label>
                <input type="number" value="${m.porcentagemSobra}" step="1" max="100" min="0" onchange="window.atualizarMetaPorcentagem(${i}, this.value)" 
                    style="width: 100px; padding: 10px; border-radius: 8px; border: 1px solid var(--border-light); background: rgba(0,0,0,0.5); color: #fff;"> %
                <progress id="prog-${i}" value="0" max="100"></progress>
            </div>`).join('');
    }
    
    // Atualiza lógica dos valores de sobra baseados em %
    window.dados.metas.forEach((m, i) => {
        const valorAporte = sobraAtual > 0 ? sobraAtual * (m.porcentagemSobra / 100) : 0;
        const prog = document.getElementById(`prog-${i}`); 
        const txt = document.getElementById(`txt-${i}`);
        if (prog && txt) {
            let alvoLimit = m.valorAlvo > 0 ? m.valorAlvo : 1000;
            prog.value = (valorAporte / alvoLimit) * 100; // Progresso simbólico
            txt.textContent = valorAporte.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
        }
    });
}

window.atualizarMetaNome = function (index, valor) { window.dados.metas[index].nome = valor; window.salvarMetasLocal(); }
window.atualizarMetaPorcentagem = function (index, valor) { window.dados.metas[index].porcentagemSobra = parseFloat(valor)||0; window.renderMetas(); window.salvarMetasLocal(); }

window.addMeta = function () {
    window.dados.metas.push({ nome: "Nova Meta", valorAlvo: 1000, porcentagemSobra: 10 });
    window.renderMetas();
    window.salvarMetasLocal();
}

window.deletarMeta = function (index) {
    if(confirm('Apagar Meta?')) {
        window.dados.metas.splice(index, 1);
        window.renderMetas();
        window.salvarMetasLocal();
    }
}

window.salvarMetasLocal = function() {
    localStorage.setItem("FinanzaMetas", JSON.stringify(window.dados.metas));
}

document.addEventListener('DOMContentLoaded', inicializarMetas);
