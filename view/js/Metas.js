import { renderHeader, parseNumber, validarAcesso } from './header.js';



window.dados = {
    metas: [],
    despesas: [],
    mesVisualizacao: new Date().getMonth(),
    anoVisualizacao: new Date().getFullYear(),
};

let sobraAtual = 0;
let chartDoughnut;

function initChart() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.color = '#9a9ab0';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    if (chartDoughnut) chartDoughnut.destroy();

    const canvas1 = document.getElementById('meuGrafico');
    if (canvas1) {
        const ctx1 = canvas1.getContext('2d');
        chartDoughnut = new Chart(ctx1, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#00b09b', '#33e0ff', '#a55eea', '#ffd700', '#ff9f43', '#ff6677'], borderWidth: 0, hoverOffset: 4 }] },
            options: { plugins: { legend: { display: false } }, cutout: '70%', maintainAspectRatio: true, aspectRatio: 1 },
            plugins: [{
                id: 'htmlLegend',
                afterUpdate(chart) {
                    const legendEl = document.getElementById('distribuicao-legenda');
                    if (!legendEl) return;
                    const labels = chart.data.labels || [];
                    const colors = chart.data.datasets[0]?.backgroundColor || [];
                    const valores = chart.data.datasets[0]?.data || [];
                    
                    legendEl.innerHTML = labels.map((label, i) => {
                        const cor = colors[i % colors.length];
                        const valFormatado = valores[i].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        return `<div class="leg-item" style="display: flex; align-items: center; gap: 10px; padding: 5px 8px; border-radius: 6px; transition: background 0.2s ease;">
                            <span class="leg-cor" style="background:${cor}; width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;"></span>
                            <span class="leg-nome" style="flex: 1; font-size: 13px; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
                            <span class="leg-pct" style="font-size: 12px; font-weight: 700; color: var(--text-muted); min-width: 34px; text-align: right;">${valFormatado}</span>
                        </div>`;
                    }).join('');
                }
            }]
        });
    }
}

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
    initChart();
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
    const rs = document.getElementById('resultado-sobra');
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
                <div class="input-row fade-in-up" style="display: flex; gap: 12px; margin-top: 10px; align-items: center;">
                    <input type="number" value="${m.porcentagemSobra}" step="1" max="100" min="0" onchange="window.atualizarMetaPorcentagem(${i}, this.value)" 
                        class="input-meta-porcentagem" placeholder="0">
                    <span style="color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">% do aporte</span>
                </div>
                <progress id="prog-${i}" value="0" max="100"></progress>
            </div>`).join('');
    }
    
    let labelsGrafico = [];
    let dadosGrafico = [];

    // Atualiza lógica dos valores de sobra baseados em %
    window.dados.metas.forEach((m, i) => {
        const valorAporte = sobraAtual > 0 ? sobraAtual * (m.porcentagemSobra / 100) : 0;
        
        labelsGrafico.push(m.nome || 'Meta');
        dadosGrafico.push(valorAporte);

        const prog = document.getElementById(`prog-${i}`); 
        const txt = document.getElementById(`txt-${i}`);
        if (prog && txt) {
            let alvoLimit = m.valorAlvo > 0 ? m.valorAlvo : 1000;
            prog.value = (valorAporte / alvoLimit) * 100; // Progresso simbólico
            txt.textContent = valorAporte.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
        }
    });

    if (chartDoughnut && labelsGrafico.length > 0) {
        chartDoughnut.data.labels = labelsGrafico;
        chartDoughnut.data.datasets[0].data = dadosGrafico;
        chartDoughnut.update();
    } else if (chartDoughnut) {
        chartDoughnut.data.labels = [];
        chartDoughnut.data.datasets[0].data = [];
        chartDoughnut.update();
    }
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

// Inicialização segura para módulos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarMetas);
} else {
    inicializarMetas();
}
