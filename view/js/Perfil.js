import { renderHeader, validarAcesso, parseNumber } from './header.js';



let chartLargo, chartArea;
let despesasGlobal = [];
window.periodosGraficosPerfil = "12meses";

async function inicializarPerfil() {
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;

    const elFotoUpload = document.getElementById('perfil-upload-foto');
    const elFotoView = document.getElementById('perfil-foto-visualizacao');
    const elNome = document.getElementById('perfil-nome');
    const elEmail = document.getElementById('perfil-email');
    const btnSair = document.getElementById('btn-sair');
    const btnSalvar = document.getElementById('btn-salvar-perfil');

    let base64Image = null;

    // Carregar os dados armazenados na Sessão (LocalStorage)
    const localUserStr = localStorage.getItem("SessaoFinanza");
    if (localUserStr) {
        try {
            const u = JSON.parse(localUserStr);
            if (u.nome) elNome.value = u.nome;
            if (u.email) elEmail.value = u.email;
            if (u.foto) {
                elFotoView.src = u.foto;
                base64Image = u.foto;
            }
        } catch (e) {}
    }

    // Leitor de Imagem
    if (elFotoUpload) {
        elFotoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (rel) => {
                    base64Image = rel.target.result;
                    elFotoView.src = base64Image;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Salvar Perfil
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            let u = {};
            if (localUserStr) {
                try { u = JSON.parse(localUserStr); } catch (e) {}
            }
            u.nome = elNome.value;
            if (base64Image) u.foto = base64Image;

            localStorage.setItem("SessaoFinanza", JSON.stringify(u));
            alert("Perfil atualizado com sucesso!");
            window.location.reload();
        });
    }

    // Sair
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            if (typeof supabase !== 'undefined' && supabase.auth) {
                await supabase.auth.signOut();
            }
            localStorage.removeItem("SessaoFinanza");
            window.location.href = "login.html";
        });
    }

    // Carregar Dados para Gráficos
    if (typeof window.buscarItens === 'function') {
        despesasGlobal = await window.buscarItens();
    }
    
    initCharts();
    atualizarGraficos();
}

function initCharts() {
    if (typeof Chart === "undefined") return;

    Chart.defaults.color = '#9a9ab0';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    
    const ctxLargo = document.getElementById('graficoLargo')?.getContext('2d');
    if (ctxLargo) {
        chartLargo = new Chart(ctxLargo, {
            type: 'bar',
            data: { labels: [], datasets: [
                { label: 'Ganhos', data: [], backgroundColor: '#33ffb8', borderRadius: 6 },
                { label: 'Gastos', data: [], backgroundColor: 'rgba(51, 224, 255, 0.6)', borderRadius: 6 }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#f0f0f5' } } } }
        });
    }

    const ctxArea = document.getElementById('graficoArea')?.getContext('2d');
    if (ctxArea) {
        chartArea = new Chart(ctxArea, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Saldo/Patrimônio', data: [], borderColor: '#33ffb8', backgroundColor: 'rgba(51, 255, 184, 0.2)', fill: 'origin', tension: 0.4
            }]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}

function atualizarGraficos() {
    if (!chartLargo || !chartArea) return;

    const agora = new Date();
    let labels = [];
    let dGanhos = [];
    let dGastos = [];
    let dPatrimonio = [];
    let saldoAcumulado = 0;

    const modo = window.periodosGraficosPerfil;

    if (modo === "custom") {
        const dIniStr = document.getElementById('data-inicio-perfil')?.value;
        const dFimStr = document.getElementById('data-fim-perfil')?.value;

        if (dIniStr && dFimStr) {
            const dIni = new Date(dIniStr + "T00:00:00");
            const dFim = new Date(dFimStr + "T23:59:59");

            labels = ["Resultado do Período"];
            let ganhoTotal = 0;
            let gastoTotal = 0;

            despesasGlobal.forEach(d => {
                const dt = new Date(d.data + "T12:00:00");
                if (dt >= dIni && dt <= dFim) {
                    const val = parseNumber(d.valor) || 0;
                    if (d.tipo === 'Entrada') ganhoTotal += val; else gastoTotal += val;
                }
            });

            dGanhos = [ganhoTotal];
            dGastos = [gastoTotal];
            dPatrimonio = [ganhoTotal - gastoTotal];
        }
    } else if (modo === "4semanas") {
        labels = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
        dGanhos = [0, 0, 0, 0];
        dGastos = [0, 0, 0, 0];
        const mesAtual = agora.getMonth();
        despesasGlobal.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt.getMonth() === mesAtual && dt.getFullYear() === agora.getFullYear()) {
                const sem = Math.min(Math.floor((dt.getDate() - 1) / 7), 3);
                const val = parseNumber(d.valor) || 0;
                if (d.tipo === 'Entrada') dGanhos[sem] += val; else dGastos[sem] += val;
            }
        });
        let curr = 0;
        dPatrimonio = dGanhos.map((g, i) => { curr += (g - dGastos[i]); return curr; });
    } else if (modo === "anos") {
        const anosMap = {};
        despesasGlobal.forEach(d => {
            const ano = new Date(d.data + "T12:00:00").getFullYear();
            if (!anosMap[ano]) anosMap[ano] = { ganho: 0, gasto: 0 };
            const val = parseNumber(d.valor) || 0;
            if (d.tipo === 'Entrada') anosMap[ano].ganho += val; else anosMap[ano].gasto += val;
        });
        labels = Object.keys(anosMap).sort();
        let curr = 0;
        labels.forEach(a => {
            dGanhos.push(anosMap[a].ganho);
            dGastos.push(anosMap[a].gasto);
            curr += (anosMap[a].ganho - anosMap[a].gasto);
            dPatrimonio.push(curr);
        });
    } else {
        // Padrão: 12 meses
        const inicio12 = new Date();
        inicio12.setMonth(agora.getMonth() - 11);
        inicio12.setDate(1);

        despesasGlobal.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt < inicio12) {
                const val = parseNumber(d.valor) || 0;
                saldoAcumulado += (d.tipo === 'Entrada' ? val : -val);
            }
        });

        for (let i = 11; i >= 0; i--) {
            const targetM = new Date();
            targetM.setMonth(agora.getMonth() - i);
            labels.push(targetM.toLocaleString('pt-BR', { month: 'short' }));

            let ganhoM = 0, gastoM = 0;
            despesasGlobal.forEach(d => {
                const dt = new Date(d.data + "T12:00:00");
                if (dt.getMonth() === targetM.getMonth() && dt.getFullYear() === targetM.getFullYear()) {
                    const val = parseNumber(d.valor) || 0;
                    if (d.tipo === 'Entrada') ganhoM += val; else gastoM += val;
                }
            });
            dGanhos.push(ganhoM); dGastos.push(gastoM);
            saldoAcumulado += (ganhoM - gastoM);
            dPatrimonio.push(saldoAcumulado);
        }
    }

    chartLargo.data.labels = labels;
    chartLargo.data.datasets[0].data = dGanhos;
    chartLargo.data.datasets[1].data = dGastos;
    chartLargo.update();

    chartArea.data.labels = labels;
    chartArea.data.datasets[0].data = dPatrimonio;
    chartArea.update();
}

window.mudarPeriodoGraficoGlobal = function (valor) {
    window.periodosGraficosPerfil = valor;
    const controlesCustom = document.getElementById('controles-data-custom');
    if (controlesCustom) {
        controlesCustom.style.display = (valor === 'custom') ? 'flex' : 'none';
    }
    atualizarGraficos();
};

window.aplicarFiltroCustomPerfil = function () {
    atualizarGraficos();
};

document.addEventListener('DOMContentLoaded', inicializarPerfil);
