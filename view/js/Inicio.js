import { renderHeader, validarAcesso } from './header.js';
import { importarExtratoCSV } from './parser.js';

// 1. CARREGAMENTO DA INTERFACE E MENU


// 2. VARIÁVEIS GLOBAIS DA ABA INÍCIO
window.dados = {
    despesas: [],
    mesVisualizacao: new Date().getMonth(),
    anoVisualizacao: new Date().getFullYear(),
    modoLista: 'extenso', // 'extenso' ou 'resumo'
    salario: 0
};
let sobraAtual = 0;
let chartDoughnut;
let timeoutCalculo;

async function inicializarInicio() {
    // Validação de Acesso
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;
    // Definir Anos
    const seletorAno = document.getElementById('seletor-ano');
    const anoAtualRef = new Date().getFullYear();
    if (seletorAno) {
        seletorAno.innerHTML = '';
        for (let a = anoAtualRef - 2; a <= anoAtualRef + 2; a++) {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            opt.style.backgroundColor = "#000";
            seletorAno.appendChild(opt);
        }
        seletorAno.value = window.dados.anoVisualizacao;
        seletorAno.addEventListener('change', () => {
            window.dados.anoVisualizacao = parseInt(seletorAno.value);
            window.renderDespesas(); window.calcularTudo();
        });
    }

    const seletorMes = document.getElementById('seletor-mes');
    if (seletorMes) {
        seletorMes.value = window.dados.mesVisualizacao;
        seletorMes.addEventListener('change', () => {
            window.dados.mesVisualizacao = parseInt(seletorMes.value);
            window.renderDespesas(); window.calcularTudo();
        });
    }

    // Carregar do Indexed Database
    if (typeof window.buscarItens === 'function') {
        const itens = await window.buscarItens();
        if (itens && itens.length > 0) window.dados.despesas = itens;
    }

    initChart();
    window.renderDespesas();
    window.calcularTudo();
}

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
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#33e0ff', '#ff6677', '#ffd700', '#a55eea', '#ff9f43', '#ff3388'], borderWidth: 0, hoverOffset: 4 }] },
            options: { plugins: { legend: { display: false } }, cutout: '70%', maintainAspectRatio: true, aspectRatio: 1 },
            plugins: [{
                id: 'htmlLegend',
                afterUpdate(chart) {
                    const legendEl = document.getElementById('distribuicao-legenda');
                    if (!legendEl) return;
                    const labels = chart.data.labels || [];
                    const colors = chart.data.datasets[0]?.backgroundColor || [];
                    const valores = chart.data.datasets[0]?.data || [];
                    const total = valores.reduce((a, b) => a + b, 0);
                    legendEl.innerHTML = labels.map((label, i) => {
                        const pct = total > 0 ? Math.round((valores[i] / total) * 100) : 0;
                        const cor = colors[i % colors.length];
                        return `<div class="leg-item">
                            <span class="leg-cor" style="background:${cor}"></span>
                            <span class="leg-nome">${label}</span>
                            <span class="leg-pct">${pct}%</span>
                        </div>`;
                    }).join('');
                }
            }]
        });
    }
}

window.agendarCalculo = function () {
    clearTimeout(timeoutCalculo);
    timeoutCalculo = setTimeout(() => { window.calcularTudo(); }, 400);
};

window.renderDespesas = function () {
    const listaDespesas = document.getElementById('lista-despesas');
    if (!listaDespesas) return;

    const mesS = window.dados.mesVisualizacao;
    const anoS = window.dados.anoVisualizacao;

    const despesasFiltradas = window.dados.despesas
        .map((d, i) => ({ ...d, originalIndex: i }))
        .filter(d => {
            if (!d.data) return false;
            const dt = new Date(d.data + "T12:00:00");
            return dt.getMonth() === mesS && dt.getFullYear() === anoS;
        });

    if (despesasFiltradas.length === 0) {
        listaDespesas.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">Nenhum registro encontrado para este mês.</p>`;
        return;
    }

    if (window.dados.modoLista === 'resumo') {
        const resumoMap = {};
        despesasFiltradas.forEach(d => {
            const labelAgrupamento = d.tipo === 'Entrada' ? (d.nome || 'Desconhecida') : (d.categoria || 'Geral');
            const chave = `${d.tipo}|||${labelAgrupamento}`;
            if (!resumoMap[chave]) resumoMap[chave] = { valor: 0, tipo: d.tipo, label: labelAgrupamento };
            resumoMap[chave].valor += (window.parseNumber(d.valor) || 0);
        });

        const itensResumo = Object.values(resumoMap);
        const entradas = itensResumo.filter(i => i.tipo === 'Entrada').sort((a,b) => b.valor - a.valor);
        const saidas = itensResumo.filter(i => i.tipo !== 'Entrada').sort((a,b) => b.valor - a.valor);

        const renderCard = (item) => `
            <div class="card-categoria-resumo fade-in-up ${item.tipo === 'Entrada' ? 'res-entrada' : 'res-saida'}">
                <div class="res-cap">
                    <span class="res-cat">${item.label}</span><span class="res-dot"></span>
                </div>
                <div class="res-val">${item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>`;

        let html = '<div class="resumo-grid">';
        if (entradas.length > 0) html += `<div class="resumo-secao-label resumo-label-entrada">▲ Receitas</div>` + entradas.map(renderCard).join('');
        if (saidas.length > 0) html += `<div class="resumo-secao-label resumo-label-saida">▼ Despesas</div>` + saidas.map(renderCard).join('');
        html += '</div>';
        listaDespesas.innerHTML = html;

    } else {
        // MODO EXTENSO
        listaDespesas.innerHTML = despesasFiltradas.map((d) => {
            let valorDisplay = (d.valor !== undefined && d.valor !== null) ? d.valor : '';
            if (valorDisplay === 0 || valorDisplay === '0') valorDisplay = '00,00';
            return `
            <div class="input-row fade-in-up ${d.tipo === 'Entrada' ? 'item-entrada' : 'item-saida'}">
                <input type="date" value="${d.data || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'data', this.value)" style="flex: 1;">
                <input type="text" value="${d.nome || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'nome', this.value)" style="flex: 3;" placeholder="${d.tipo === 'Entrada' ? 'Fonte/Pagador' : 'Descrição'}">
                <input type="text" list="opcoes-categorias-${d.tipo === 'Entrada' ? 'entrada' : 'saida'}" value="${d.categoria || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'categoria', this.value)" style="flex: 2;" placeholder="Categoria">
                <input type="text" value="${valorDisplay}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'valor', this.value)" style="flex: 1.2;" placeholder="R$ 0,00">
                <button type="button" class="btn-delete" onclick="window.deletarDespesa(${d.originalIndex})">✖</button>
            </div>`;
        }).join('');
    }
}

window.calcularTudo = function() {
    const mesAtual = window.dados.mesVisualizacao;
    const anoAtual = window.dados.anoVisualizacao;

    let totalEntradas = 0;
    let totalSaidas = 0;

    const resumosGrafico = {};

    window.dados.despesas.forEach(d => {
        if (!d.data) return;
        const dData = new Date(d.data + "T12:00:00");
        if (dData.getMonth() === mesAtual && dData.getFullYear() === anoAtual) {
            const val = window.parseNumber(d.valor) || 0;
            if (d.tipo === "Entrada") {
                totalEntradas += val;
            } else {
                totalSaidas += val;
                
                // Preparar dados do gráfico
                const cat = d.categoria || 'Geral';
                resumosGrafico[cat] = (resumosGrafico[cat] || 0) + val;
            }
        }
    });

    window.dados.salario = totalEntradas;
    document.getElementById('receita-mensal-exibicao').textContent = totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Recupera Vazamento SOS localStorage
    let vazamentoSOS = 0;
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
    
    totalSaidas += vazamentoSOS;
    sobraAtual = totalEntradas - totalSaidas;

    const elemSobra = document.getElementById('resultado-sobra');
    const elemLabel = document.getElementById('label-sobra');
    const elemCard = document.getElementById('status-card');

    if (elemSobra && elemLabel && elemCard) {
        if (sobraAtual < 0) {
            elemSobra.className = "valor-gigante negativo";
            elemLabel.className = "uppercase-label text-red";
            elemLabel.textContent = "Déficit Mensal" + (vazamentoSOS > 0 ? " (incl. SOS)" : "");
            elemCard.style.borderColor = "var(--accent-red)";
        } else if (sobraAtual > 0) {
            elemSobra.className = "valor-gigante positivo";
            elemLabel.className = "uppercase-label text-green";
            elemLabel.textContent = "Sobra Mensal Estimada";
            elemCard.style.borderColor = "var(--accent-green)";
        } else {
            elemSobra.className = "valor-gigante neutro";
            elemLabel.className = "uppercase-label text-muted";
            elemLabel.textContent = "Saldo Zerado";
            elemCard.style.borderColor = "var(--border-light)";
        }
        elemSobra.textContent = sobraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Atualiza Gráfico
    if (chartDoughnut) {
        chartDoughnut.data.labels = Object.keys(resumosGrafico);
        chartDoughnut.data.datasets[0].data = Object.values(resumosGrafico);
        chartDoughnut.update();
    }
}

window.mudarModoLista = function(modo) {
    window.dados.modoLista = modo;
    document.querySelectorAll('.btn-toggle-modo').forEach(btn => {
        btn.style.background = 'transparent'; btn.style.color = '#fff';
    });
    const btnAtivo = document.getElementById(modo === 'extenso' ? 'mode-extenso' : 'mode-resumo');
    if (btnAtivo) {
        btnAtivo.style.background = 'var(--accent-green)'; btnAtivo.style.color = '#000';
    }
    window.renderDespesas();
};

window.atualizarRegistroDB = async function(index, campo, valor) {
    if (!window.dados.despesas[index]) return;
    window.dados.despesas[index][campo] = valor;
    try {
        if (typeof adicionarItem === 'function') {
            const tempObj = window.dados.despesas[index];
            const novoId = await adicionarItem(tempObj);
            if (!tempObj.id) tempObj.id = novoId;
        }
    } catch (e) { console.error("Erro DB", e); }
    window.agendarCalculo();
};

window.addDespesa = async function() {
    const dataP = `${window.dados.anoVisualizacao}-${String(window.dados.mesVisualizacao + 1).padStart(2, '0')}-01`;
    const obj = { nome: "Novo Gasto", valor: "00,00", categoria: "Geral", data: dataP, tipo: "Saída" };
    try { if (typeof adicionarItem === 'function') obj.id = await adicionarItem(obj); } catch(e){}
    window.dados.despesas.push(obj); window.renderDespesas(); window.agendarCalculo();
}

window.addReceita = async function() {
    const dataP = `${window.dados.anoVisualizacao}-${String(window.dados.mesVisualizacao + 1).padStart(2, '0')}-01`;
    const obj = { nome: "Nova Receita", valor: "00,00", categoria: "Salário", data: dataP, tipo: "Entrada" };
    try { if (typeof adicionarItem === 'function') obj.id = await adicionarItem(obj); } catch(e){}
    window.dados.despesas.push(obj); window.renderDespesas(); window.agendarCalculo();
}

window.deletarDespesa = async function(index) {
    const item = window.dados.despesas[index];
    if (item && item.id && typeof deletarItem === 'function') {
        try { await deletarItem(item.id); } catch (e) { console.error(e); }
    }
    window.dados.despesas.splice(index, 1);
    window.renderDespesas(); window.calcularTudo();
}

window.apagarTudo = async function() {
    if (confirm("⚠️ ATENÇÃO: Deseja apagar TODOS os dados (incluindo SOS e Metas)?\nEssa ação não pode ser desfeita.")) {
        if (typeof limparTodosItens === 'function') await limparTodosItens();
        localStorage.removeItem("FinanzaSOS");
        localStorage.removeItem("FinanzaMetas");
        window.dados.despesas = [];
        window.renderDespesas(); window.calcularTudo();
        alert("Dados resetados com sucesso.");
    }
}

window.exportarCSV = function() {
    if (window.dados.despesas.length === 0) { alert("Não há registros para exportar."); return; }
    let csv = "\uFEFFData,Tipo,Nome,Categoria,Valor\n";
    window.dados.despesas.forEach(d => {
        let v = typeof d.valor === 'number' ? d.valor.toFixed(2) : String(d.valor);
        csv += `${d.data},${d.tipo},${d.nome.replace(/,/g, " ")},${d.categoria},${d.tipo==='Saída'?'-':''}${v}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Gastos_Finanza.csv");
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
}

window.exportarPDF = function(btn) {
    if(typeof html2pdf !== 'undefined') {
        const text = btn.innerHTML; btn.innerHTML = '⏳ Gerando...';
        const element = document.getElementById('dash-inicio-container') || document.body;
        html2pdf().set({
            margin: 5,
            filename: 'Relatorio_Finanza.pdf',
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#101012" },
            jsPDF: { unit: 'mm', format: 'a3', orientation: 'portrait' }
        }).from(element).save().then(() => btn.innerHTML=text);
    } else {
        alert("Biblioteca PDF não carregada.");
    }
}

window.importarExtratoCSV = function(input) {
    importarExtratoCSV(input, async (res) => {
        if (res.registros && res.registros.length > 0) {
            for (const reg of res.registros) {
                if (typeof adicionarItem === 'function') {
                    reg.id = await adicionarItem(reg);
                }
                window.dados.despesas.push(reg);
            }
            window.dados.mesVisualizacao = res.mes;
            window.dados.anoVisualizacao = res.ano;
            const sM = document.getElementById('seletor-mes'); if (sM) sM.value = res.mes;
            const sA = document.getElementById('seletor-ano'); if (sA) sA.value = res.ano;
            
            window.renderDespesas();
            window.calcularTudo();
            alert(`✅ ${res.total} registros importados com sucesso!`);
        }
    });
};

document.addEventListener('DOMContentLoaded', inicializarInicio);
