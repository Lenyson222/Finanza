import { renderHeader, validarAcesso, parseNumber } from '../shared/header.js';



let chartLargo, chartArea;
let despesasGlobal = [];

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
            window.location.href = "../../Login/login.html";
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

    // Calcular saldo acumulado ANTES dos últimos 12 meses
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
        const mesNome = targetM.toLocaleString('pt-BR', { month: 'short' });
        labels.push(mesNome);

        let ganhoM = 0;
        let gastoM = 0;

        despesasGlobal.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt.getMonth() === targetM.getMonth() && dt.getFullYear() === targetM.getFullYear()) {
                const val = parseNumber(d.valor) || 0;
                if (d.tipo === 'Entrada') ganhoM += val; else gastoM += val;
            }
        });

        dGanhos.push(ganhoM);
        dGastos.push(gastoM);
        saldoAcumulado += (ganhoM - gastoM);
        dPatrimonio.push(saldoAcumulado);
    }

    chartLargo.data.labels = labels;
    chartLargo.data.datasets[0].data = dGanhos;
    chartLargo.data.datasets[1].data = dGastos;
    chartLargo.update();

    chartArea.data.labels = labels;
    chartArea.data.datasets[0].data = dPatrimonio;
    chartArea.update();
}

document.addEventListener('DOMContentLoaded', inicializarPerfil);
