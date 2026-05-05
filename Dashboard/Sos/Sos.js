import { renderHeader, parseNumber, validarAcesso } from '../shared/header.js';



window.dados = {
    sosChecklist: [],
    sosCalc: { divida: 0, juros: 0, futilidades: 0 },
    despesasGlobal: [] // Usado para calcular Autonomia Baseado na Sobra Real
};

let sobraAtualGlobal = 0;

window.salvarSOSLocal = function () {
    localStorage.setItem("FinanzaSOS", JSON.stringify({
        checklist: window.dados.sosChecklist,
        calc: window.dados.sosCalc
    }));
};

window.carregarSOSLocal = async function () {
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;

    // 1. Carrega SOS Salvo
    const salvo = localStorage.getItem("FinanzaSOS");
    if (salvo) {
        try {
            const parsed = JSON.parse(salvo);
            if (parsed.checklist) window.dados.sosChecklist = parsed.checklist;
            if (parsed.calc) window.dados.sosCalc = parsed.calc;
        } catch (e) { }
    }

    // 2. Calcula Sobra Externa vinda do Banco de Dados Principal Local (para cálculo de Autonomia)
    if (typeof window.buscarItens === 'function') {
        const itens = await window.buscarItens();
        if(itens) window.dados.despesasGlobal = itens;
        
        let entradas = 0; let saidas = 0;
        let dDate = new Date();
        window.dados.despesasGlobal.forEach(d => {
            if (!d.data) return;
            const dt = new Date(d.data + "T12:00:00");
            if (dt.getMonth() === dDate.getMonth() && dt.getFullYear() === dDate.getFullYear()) {
                const val = parseNumber(d.valor) || 0;
                if(d.tipo === 'Entrada') entradas += val; else saidas += val;
            }
        });
        sobraAtualGlobal = entradas - saidas;
    }

    window.renderChecklistSOS();
    window.carregarVazamentoSOS();
};

window.renderChecklistSOS = function () {
    const lista = document.getElementById('lista-checklist-sos');
    if (!lista) return;

    if (!window.dados.sosChecklist || window.dados.sosChecklist.length === 0) {
        window.dados.sosChecklist = [
            { texto: "Listar e somar todas as dívidas ativas", checked: false },
            { texto: "Interromper o uso de novos cartões de crédito", checked: false },
            { texto: "Cancelar agora as assinaturas não-essenciais", checked: false },
            { texto: "Ligar para o banco e renegociar taxas de juros", checked: false }
        ];
    }

    lista.innerHTML = window.dados.sosChecklist.map((item, i) => `
        <div class="chk-item ${item.checked ? 'checked' : ''}" style="width: 100%;">
            <div class="chk-box" onclick="window.toggleChecklistSOS(${i})" style="flex-shrink: 0;"></div>
            <input type="text" value="${item.texto}" onchange="window.atualizarTextoChecklistSOS(${i}, this.value)" 
                style="flex: 1; background: transparent; border: none; color: inherit; padding: 5px; font-size: 14px; outline: none;">
            <button type="button" class="btn-delete" onclick="window.deletarItemChecklistSOS(${i})" style="flex: 0 0 auto; width: 30px; height: 30px; font-size: 13px;">✖</button>
        </div>
    `).join('');

    const total = window.dados.sosChecklist.length;
    const concluidos = window.dados.sosChecklist.filter(it => it.checked).length;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const badge = document.getElementById('sos-progress-badge');
    if (badge) badge.textContent = `${pct}% Concluído`;
};

window.atualizarTextoChecklistSOS = (index, text) => { window.dados.sosChecklist[index].texto = text; window.salvarSOSLocal(); };
window.toggleChecklistSOS = (index) => { window.dados.sosChecklist[index].checked = !window.dados.sosChecklist[index].checked; window.renderChecklistSOS(); window.salvarSOSLocal(); };
window.addItemChecklistSOS = () => { window.dados.sosChecklist.push({texto:'', checked:false}); window.renderChecklistSOS(); window.salvarSOSLocal(); };
window.deletarItemChecklistSOS = (index) => { window.dados.sosChecklist.splice(index, 1); window.renderChecklistSOS(); window.salvarSOSLocal(); };

window.syncSOS = function (origem) {
    const sD = document.getElementById('sos-divida-slider');
    const iD = document.getElementById('sos-divida-input');
    if (origem === 'slider' && sD && iD) iD.value = sD.value;
    else if (origem === 'input' && sD && iD) sD.value = iD.value;
    window.atualizarDadosSOS();
};

window.atualizarDadosSOS = function () {
    const vD = parseFloat(document.getElementById('sos-divida-input').value) || 0;
    const vJ = parseFloat(document.getElementById('sos-juros-slider').value) || 0;
    const vF = parseFloat(document.getElementById('sos-futilidades').value) || 0;

    window.dados.sosCalc = { divida: vD, juros: vJ, futilidades: vF };
    document.getElementById('val-juros').textContent = vJ + '%';

    window.salvarSOSLocal();
    window.calcularVazamentoSOS();
};

window.carregarVazamentoSOS = function () {
    const sD = document.getElementById('sos-divida-slider');
    const iD = document.getElementById('sos-divida-input');
    const sJ = document.getElementById('sos-juros-slider');
    const iF = document.getElementById('sos-futilidades');

    if (sD) sD.value = window.dados.sosCalc.divida || 0;
    if (iD) iD.value = window.dados.sosCalc.divida || 0;
    if (sJ) { sJ.value = window.dados.sosCalc.juros || 0; document.getElementById('val-juros').textContent = sJ.value + '%'; }
    if (iF) iF.value = window.dados.sosCalc.futilidades || 0;

    window.calcularVazamentoSOS();
};

window.calcularVazamentoSOS = function () {
    const vazamentoTotal = (window.dados.sosCalc.divida * (window.dados.sosCalc.juros / 100)) + window.dados.sosCalc.futilidades;
    const resultado = document.getElementById('sos-prejuizo-resultado');
    if (resultado) {
        resultado.textContent = vazamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resultado.style.color = vazamentoTotal > 300 ? '#ff3388' : (vazamentoTotal > 0 ? '#FFA500' : 'var(--text-main)');
        const barV = document.getElementById('vazamento-bar');
        if (barV) barV.style.width = Math.min((vazamentoTotal / 2000) * 100, 100) + '%';
    }

    const autonRes = document.getElementById('sos-autonomia-resultado');
    if (autonRes) {
        const divida = window.dados.sosCalc.divida || 0;
        const jurosMensal = (window.dados.sosCalc.juros || 0) / 100;
        let pctAuton = 0;

        if (divida <= 0) { autonRes.textContent = "Sem Dívida"; autonRes.style.color = "var(--accent-green)"; pctAuton = 100; }
        else if (sobraAtualGlobal < 0) { autonRes.textContent = "Crítico (Déficit)"; autonRes.style.color = "var(--accent-red)"; pctAuton = 5; }
        else {
            const custoJuros = divida * jurosMensal;
            if (custoJuros <= 0) { autonRes.textContent = "Estável"; autonRes.style.color = "var(--accent-green)"; pctAuton = 100; }
            else {
                const multi = (sobraAtualGlobal / custoJuros);
                autonRes.textContent = multi.toFixed(1) + "x Juros Base";
                autonRes.style.color = multi < 1 ? "var(--accent-red)" : (multi < 3 ? "var(--accent-blue)" : "var(--accent-green)");
                pctAuton = Math.min((multi / 5) * 100, 100);
            }
        }
        document.getElementById('autonomia-bar').style.width = pctAuton + '%';
    }
};

window.mudarPassoSOS = function(passo) {
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${passo}`).classList.add('active');
    const tips = {
        1: "Foco inicial: Identifique todos os gastos recorrentes e cancele o que não for vital para sobrevivência.",
        2: "Hora de agir: Venda itens que não usa, busque rendas extras pontuais e renegocie prazos de dívidas curtas.",
        3: "Horizonte: Assim que o vazamento estancar, dedique 10% da sua sobra para reconstruir sua reserva de emergência."
    };
    document.getElementById('sos-tip-text').textContent = tips[passo];
};

window.simularAcaoSOS = function(tipo) {
    const sJ = document.getElementById('sos-juros-slider');
    const iF = document.getElementById('sos-futilidades');
    if (tipo === 'streaming') iF.value = Math.max(0, parseFloat(iF.value||0) - 50);
    if (tipo === 'delivery') iF.value = Math.max(0, parseFloat(iF.value||0) - 200);
    if (tipo === 'renegotiate') sJ.value = Math.max(0, parseFloat(sJ.value||0) - 2);
    window.atualizarDadosSOS();
};

window.exportarPlanilhaResgate = function () {
    let csv = "\uFEFFPLANO DE RESGATE FINANZA\n\nDIAGNOSTICO DA DIVIDA\n";
    csv += `Divida Total;R$ ${window.dados.sosCalc.divida}\nJuros Mensal;${window.dados.sosCalc.juros}%\n`;
    csv += `Gastos Futeis;R$ ${window.dados.sosCalc.futilidades}\n\nCHECKLIST DE ACOES\nStatus;Acao\n`;
    window.dados.sosChecklist.forEach(it => { csv += `${it.checked?"[CONCLUIDO]":"[PENDENTE]"};${it.texto}\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })));
    link.setAttribute("download", "Plano_Resgate.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', window.carregarSOSLocal);
