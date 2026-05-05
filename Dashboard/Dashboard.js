// ====== 1. TRAVA DE SEGURANÇA E LEITURA DE SESSÃO ======
const supabase = window.supabaseClient;

async function validarAcesso() {
    if (!supabase) {
        console.warn("Supabase Client não encontrado. Verifique a configuração.");
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessaoLocal = localStorage.getItem("SessaoFinanza");

        if (!session && !sessaoLocal) {
            window.location.href = "../Login/login.html";
            return;
        }

        // Se temos uma sessão no Supabase (Google), garantimos que o localStorage esteja sincronizado
        if (session) {
            const user = session.user;
            const dadosSessao = {
                tipo: "google",
                uid: user.id,
                name: user.user_metadata.full_name || user.email,
                foto: user.user_metadata.avatar_url || "",
                email: user.email
            };
            localStorage.setItem("SessaoFinanza", JSON.stringify(dadosSessao));
        }
    } catch (err) {
        console.error("Erro na validação de acesso:", err);
    }
}

// Executa validação em segundo plano para não bloquear a definição das funções de UI
validarAcesso();

const sessaoString = localStorage.getItem("SessaoFinanza") || '{"tipo":"convidado","nome":"Convidado"}';
const usuarioAtivo = JSON.parse(sessaoString);
let usuarioLogadoId = usuarioAtivo.uid || null;

// ====== 2. CONFIGURAÇÃO SUPABASE (Persistência na Nuvem) ======
// O cliente já é inicializado em supabaseClient.js e está disponível em window.supabaseClient

// ====== VARIÁVEIS GLOBAIS DA APLICAÇÃO ======
window.dados = {
    salario: 0,
    despesas: [],
    metas: [],
    sosChecklist: [
        { texto: "Listar e somar todas as dívidas ativas", checked: false },
        { texto: "Interromper o uso de novos cartões de crédito", checked: false },
        { texto: "Cancelar agora as assinaturas não-essenciais", checked: false },
        { texto: "Ligar para o banco e renegociar taxas de juros", checked: false },
        { texto: "Direcionar qualquer sobra para quitar a dívida mais cara", checked: false }
    ],
    sosCalc: { divida: '', juros: '', futilidades: '' },
    mesVisualizacao: new Date().getMonth(),
    anoVisualizacao: new Date().getFullYear(),
    modoLista: 'extenso' // 'extenso' ou 'resumo'
};

let chartDoughnut, chartLargo, chartArea;
let sobraAtual = 0;
window.graficoCriado = false;

// ====== SISTEMA DE TRATAMENTO DE NÚMEROS ======
window.parseNumber = function (val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Substitui vírgula por ponto e remove espaços ou símbolos de moeda extras
    let str = val.toString().replace(/\s/g, '').replace(/R\$/gi, '');
    let clean;
    if (str.includes(',') && str.includes('.')) {
        // Formato com milhares e decimais (ex: 1.500,00)
        clean = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        // Formato brasileiro simples (ex: 150,00)
        clean = str.replace(',', '.');
    } else {
        // Formato americano ou sem decimais
        clean = str;
    }
    let n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
};

// ====== SISTEMA ANTI-TRAVAMENTO (DEBOUNCE) ======
let timeoutCalculo;
window.agendarCalculo = function () {
    clearTimeout(timeoutCalculo);
    timeoutCalculo = setTimeout(() => {
        window.calcularTudo();
    }, 400);
};

// ====== 3. INICIALIZAÇÃO DO DASHBOARD ======
async function inicializarDashboard() {
    // 3.1. CONFIGURAÇÃO IMEDIATA DA UI (Não depende de rede)
    const seletorMes = document.getElementById('seletor-mes');
    const seletorAno = document.getElementById('seletor-ano');
    const elNome = document.getElementById('nome-usuario');
    const elFoto = document.getElementById('foto-usuario');

    // Preencher Anos
    if (seletorAno) {
        const anoAtualRef = new Date().getFullYear();
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
            window.renderDespesas();
            window.calcularTudo();
        });
    }

    if (seletorMes) {
        seletorMes.value = window.dados.mesVisualizacao;
        seletorMes.addEventListener('change', () => {
            window.dados.mesVisualizacao = parseInt(seletorMes.value);
            window.renderDespesas();
            window.calcularTudo();
        });
    }

    // Dados iniciais do usuário (Local)
    if (elNome && usuarioAtivo.nome) elNome.textContent = `Olá, ${usuarioAtivo.nome.split(' ')[0]}`;
    if (elFoto && usuarioAtivo.foto) { elFoto.src = usuarioAtivo.foto; elFoto.style.display = 'block'; }

    // 3.2. TENTAR CONEXÃO COM SUPABASE (Protegido contra falhas)
    try {
        const supabaseInst = window.supabaseClient;
        if (supabaseInst) {
            const { data: { session }, error: sessionError } = await supabaseInst.auth.getSession();

            if (session && !sessionError) {
                const user = session.user;
                usuarioLogadoId = user.id;

                // Atualiza UI com dados da conta Google
                if (elNome) elNome.textContent = `Olá, ${user.user_metadata.full_name?.split(' ')[0] || 'Usuário'}`;
                const avatar = user.user_metadata.avatar_url;
                if (elFoto && avatar) { elFoto.src = avatar; elFoto.style.display = 'block'; }

                // Busca dados no Supabase
                if (typeof window.buscarItens === 'function') {
                    const itensNuvem = await window.buscarItens();
                    if (itensNuvem && itensNuvem.length > 0) {
                        window.dados.despesas = itensNuvem;
                    }
                }
            } else {
                // Tenta carregar localmente se não houver sessão
                if (typeof window.buscarItens === 'function') {
                    const itensLocais = await window.buscarItens();
                    if (itensLocais && itensLocais.length > 0) window.dados.despesas = itensLocais;
                }
            }
        }
    } catch (error) {
        console.error("Erro na sincronização Supabase:", error);
    }

    // 3.3. FINALIZAR CARREGAMENTO (Gráficos e Cálculos)
    // Pequeno delay para garantir que o DOM de todas as abas está pronto
    setTimeout(() => {
        try { if (window.initCharts) window.initCharts(); } catch (e) { console.error(e); }
        try { if (window.populaSelectsMoedas) window.populaSelectsMoedas(); } catch (e) { console.error(e); }
        try { if (window.buscarCotacoes) window.buscarCotacoes(); } catch (e) { console.error(e); }

        window.renderDespesas();
        if (window.renderMetas) window.renderMetas();
        window.calcularTudo();
    }, 150);
}

// Inicia o Dashboard
inicializarDashboard();

window.salvarDadosNuvem = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const botao = document.getElementById('btn-salvar-nuvem');
    if (botao) botao.textContent = "⏳ Salvando...";

    try {
        // No Supabase, os itens individuais já são salvos via adicionarItem e deletarItem
        // Esta função pode ser usada para salvar configurações globais ou forçar sync
        console.log("Sincronização com Supabase ativa.");

        if (botao) {
            botao.textContent = "✅ Sincronizado";
            setTimeout(() => botao.textContent = "☁️ Nuvem Ativa", 3000);
        }
    } catch (error) {
        console.error("Erro na sincronização: ", error);
        if (botao) botao.textContent = "❌ Erro";
    }
};

// ====== NAVEGAÇÃO ENTRE ABAS ======
window.mudarMenu = function (idMenu, elementoClicado) {
    document.querySelectorAll('.nav-menu a').forEach(btn => btn.classList.remove('ativo'));
    if (elementoClicado) elementoClicado.classList.add('ativo');

    const telaOp = document.getElementById('tela-operacional');
    const telaUser = document.getElementById('tela-usuario');
    const sectionGrid = document.getElementById('tela-operacional');
    const cardGrafico = document.getElementById('card-grafico-distribuicao');

    // Esconde tudo primeiro
    if (telaOp) telaOp.style.display = 'none';
    if (telaUser) telaUser.style.display = 'none';
    document.querySelectorAll('.sub-aba').forEach(aba => aba.classList.remove('ativa'));

    if (idMenu === 'usuario' && telaUser) {
        telaUser.style.display = 'block';
    } else if (telaOp) {
        telaOp.style.display = 'grid';

        // Lógica de Layout Full-Width para Cotações e Investimentos
        if (idMenu === 'cotacao' || idMenu === 'investimento') {
            if (sectionGrid) sectionGrid.classList.add('layout-full');
            if (cardGrafico) cardGrafico.style.display = 'none';
        } else {
            if (sectionGrid) sectionGrid.classList.remove('layout-full');
            if (cardGrafico) cardGrafico.style.display = 'block';
        }

        // Mostra a aba clicada e ACORDA os gráficos específicos de cada uma
        if (idMenu === 'inicio') {
            document.getElementById('aba-inicio').classList.add('ativa');
            // Força o gráfico de rosca a atualizar agora que a aba está visível
            setTimeout(() => { if (window.atualizarGraficos) window.atualizarGraficos(); }, 100);

        } else if (idMenu === 'meta') {
            document.getElementById('aba-meta').classList.add('ativa');

        } else if (idMenu === 'cotacao') {
            document.getElementById('aba-cotacao').classList.add('ativa');
            // Força o TradingView a nascer assim que você abre a aba
            setTimeout(() => {
                if (window.atualizarGraficoTV) window.atualizarGraficoTV();
                if (window.buscarCotacoes) window.buscarCotacoes();
            }, 100);

        } else if (idMenu === 'investimento') {
            document.getElementById('aba-investimento').classList.add('ativa');
            setTimeout(() => {
                if (window.atualizarGraficoInvestimentos) window.atualizarGraficoInvestimentos();
            }, 100);
        } else if (idMenu === 'sos') {
            document.getElementById('aba-sos').classList.add('ativa');
            setTimeout(() => {
                if (window.renderChecklistSOS) window.renderChecklistSOS();
                if (window.carregarVazamentoSOS) window.carregarVazamentoSOS();
            }, 100);
        }
    }
};

// ====== TRADINGVIEW & COTAÇÕES ======
window.populaSelectsMoedas = function () {
    const top25Moedas = [
        { code: "USD", name: "Dólar Americano" }, { code: "EUR", name: "Euro" },
        { code: "BTC", name: "Bitcoin" }, { code: "BRL", name: "Real Brasileiro" },
        { code: "GBP", name: "Libra Esterlina" }, { code: "JPY", name: "Iene Japonês" },
        { code: "CHF", name: "Franco Suíço" }, { code: "AUD", name: "Dólar Australiano" },
        { code: "CAD", name: "Dólar Canadense" }, { code: "CNY", name: "Yuan Chinês" },
        { code: "ARS", name: "Peso Argentino" }, { code: "TRY", name: "Nova Lira Turca" },
        { code: "MXN", name: "Peso Mexicano" }, { code: "INR", name: "Rúpia Indiana" },
        { code: "ZAR", name: "Rand Sul-Africano" }, { code: "RUB", name: "Rublo Russo" },
        { code: "KRW", name: "Won Sul-Coreano" }, { code: "COP", name: "Peso Colombiano" },
        { code: "CLP", name: "Peso Chileno" }, { code: "UYU", name: "Peso Uruguaio" },
        { code: "ETH", name: "Ethereum" }, { code: "LTC", name: "Litecoin" },
        { code: "XRP", name: "XRP" }, { code: "DOGE", name: "Dogecoin" },
        { code: "SOL", name: "Solana" }
    ];

    const m1 = document.getElementById('moeda1');
    const m2 = document.getElementById('moeda2');
    if (!m1 || !m2) return;

    m1.innerHTML = ''; m2.innerHTML = '';

    top25Moedas.forEach(m => {
        m1.innerHTML += `<option value="${m.code}">${m.name} (${m.code})</option>`;
        m2.innerHTML += `<option value="${m.code}">${m.name} (${m.code})</option>`;
    });

    // Padrão de seleção inicial
    m1.value = "USD";
    m2.value = "BRL";
};

window.atualizarGraficoTV = function () {
    const m1 = document.getElementById('moeda1');
    const m2 = document.getElementById('moeda2');
    if (!m1 || !m2) return;

    const moeda1 = m1.value || "USD";
    const moeda2 = m2.value || "BRL";
    if (moeda1 === moeda2) return;

    const tvContainer = document.getElementById('tradingview_container');
    if (tvContainer) tvContainer.innerHTML = '';

    if (typeof TradingView !== "undefined" && tvContainer) {
        new TradingView.widget({
            "autosize": true, "symbol": moeda1 + moeda2, "interval": "D", "timezone": "America/Sao_Paulo", "theme": "dark", "style": "1", "locale": "br", "enable_publishing": false, "backgroundColor": "rgba(18, 18, 24, 0.65)", "gridColor": "rgba(255, 255, 255, 0.05)", "hide_top_toolbar": false, "hide_volume": true, "save_image": false, "container_id": "tradingview_container"
        });
    }
}

window.atualizarGraficoInvestimentos = function () {
    const ativoElement = document.getElementById('ativo-investimento');
    const containerId = 'tradingview_investimentos_container';
    if (!ativoElement) return;

    const symbol = ativoElement.value || "BMFBOVESPA:PETR4";
    const tvContainer = document.getElementById(containerId);
    if (tvContainer) tvContainer.innerHTML = '';

    if (typeof TradingView !== "undefined" && tvContainer) {
        new TradingView.widget({
            "autosize": true, "symbol": symbol, "interval": "D", "timezone": "America/Sao_Paulo", "theme": "dark", "style": "1", "locale": "br", "enable_publishing": false, "backgroundColor": "rgba(18, 18, 24, 0.65)", "gridColor": "rgba(255, 255, 255, 0.05)", "hide_top_toolbar": false, "hide_volume": true, "save_image": false, "container_id": containerId
        });
    }
}

window.buscarCotacoes = async function () {
    try {
        const resposta = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
        const apiData = await resposta.json();
        const dolar = document.getElementById('cotacao-dolar');
        const euro = document.getElementById('cotacao-euro');
        const btc = document.getElementById('cotacao-btc');

        if (dolar) dolar.textContent = `R$ ${parseFloat(apiData.USDBRL.bid).toFixed(2).replace('.', ',')}`;
        if (euro) euro.textContent = `R$ ${parseFloat(apiData.EURBRL.bid).toFixed(2).replace('.', ',')}`;
        if (btc) btc.textContent = `R$ ${parseFloat(apiData.BTCBRL.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } catch (erro) {
        console.error("Erro nas cotações:", erro);
    }
}

// ====== LÓGICA DO CHART.JS ======
window.initCharts = function () {
    if (typeof Chart === "undefined") return;

    Chart.defaults.color = '#9a9ab0';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    if (chartDoughnut) { chartDoughnut.destroy(); chartLargo.destroy(); chartArea.destroy(); }

    const canvas1 = document.getElementById('meuGrafico');
    if (canvas1) {
        const ctx1 = canvas1.getContext('2d');
        chartDoughnut = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#33e0ff', '#ff6677', '#ffd700', '#a55eea', '#ff9f43', '#ff3388'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                plugins: {
                    legend: { display: false }
                },
                cutout: '70%',
                maintainAspectRatio: true,
                aspectRatio: 1
            },
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

    const canvas2 = document.getElementById('graficoLargo');
    if (canvas2) {
        const ctx2 = canvas2.getContext('2d');
        chartLargo = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    { label: 'Ganhos', data: [], backgroundColor: '#33ffb8', borderRadius: 6 },
                    { label: 'Gastos', data: [], backgroundColor: 'rgba(51, 224, 255, 0.6)', borderRadius: 6 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#f0f0f5' } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9a9ab0' } }, x: { grid: { display: false }, ticks: { color: '#9a9ab0' } } } }
        });
    }

    const canvas3 = document.getElementById('graficoArea');
    if (canvas3) {
        const ctx3 = canvas3.getContext('2d');
        chartArea = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Saldo/Patrimônio',
                    data: [],
                    borderColor: '#33ffb8',
                    backgroundColor: 'rgba(51, 255, 184, 0.2)',
                    fill: 'origin',
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#121214',
                    pointBorderColor: '#33ffb8',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9a9ab0' } }, x: { grid: { display: false }, ticks: { color: '#9a9ab0' } } } }
        });
    }
}

// ====== LOGICA DE PERIODOS DOS GRAFICOS ======
window.periodosGraficos = { 1: "12meses", 2: "12meses" };
window.mudarPeriodoGrafico = function (id, valor) {
    window.periodosGraficos[id] = valor;
    window.calcularTudo();
};

window.mudarPeriodoGraficoGlobal = function (valor) {
    window.periodosGraficos[1] = valor;
    window.periodosGraficos[2] = valor;

    // Mostra/Esconde controles de data customizada no Perfil
    const controlesCustom = document.getElementById('controles-data-custom');
    if (controlesCustom) {
        controlesCustom.style.display = (valor === 'custom') ? 'flex' : 'none';
    }

    window.calcularTudo();
};

window.aplicarFiltroCustomPerfil = function () {
    const dataInicio = document.getElementById('data-inicio-perfil').value;
    const dataFim = document.getElementById('data-fim-perfil').value;

    if (!dataInicio || !dataFim) {
        alert("Por favor, preencha as duas datas para o filtro.");
        return;
    }

    if (new Date(dataInicio) > new Date(dataFim)) {
        alert("A data de início não pode ser maior que a data de fim.");
        return;
    }

    // Apenas recalcula os gráficos
    window.atualizarNovosGraficos();
};

// ====== ATUALIZAÇÃO DE VARIÁVEIS NA MEMÓRIA E NO INDEXEDDB ======
window.atualizarSalario = function (valor) { window.dados.salario = valor; window.agendarCalculo(); };

window.atualizarRegistroDB = async function (index, campo, valor) {
    if (!window.dados.despesas[index]) return;

    window.dados.despesas[index][campo] = valor;

    try {
        if (typeof adicionarItem === 'function') {
            const tempObj = window.dados.despesas[index];
            const novoId = await adicionarItem(tempObj);
            // Atualiza com o ID real caso ainda não tenha
            if (!tempObj.id) {
                tempObj.id = novoId;
            }
        }
    } catch (e) {
        console.error("Erro gravar DB", e);
    }
    window.agendarCalculo();
};

window.atualizarMetaNome = function (index, valor) { window.dados.metas[index].nome = valor; window.agendarCalculo(); };
window.atualizarMetaPorcentagem = function (index, valor) { window.dados.metas[index].porcentagemSobra = valor; window.agendarCalculo(); };

// ====== CÁLCULO PRINCIPAL ======
window.calcularTudo = function () {
    // 1. Calcula Receita Mensal AUTOMATICAMENTE (Soma todas as Entradas do MÊS SELECIONADO)
    const mesAtual = window.dados.mesVisualizacao;
    const anoAtual = window.dados.anoVisualizacao;

    let totalEntradasMes = 0;
    window.dados.despesas.forEach(d => {
        if (!d.data) return;
        const dData = new Date(d.data + "T12:00:00");
        if (dData.getMonth() === mesAtual && dData.getFullYear() === anoAtual && d.tipo === "Entrada") {
            totalEntradasMes += window.parseNumber(d.valor);
        }
    });

    window.dados.salario = totalEntradasMes;
    const elRecExibicao = document.getElementById('receita-mensal-exibicao');
    if (elRecExibicao) {
        elRecExibicao.textContent = totalEntradasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    let totalEntradasGeral = totalEntradasMes;
    let totalSaidasGeral = 0;

    // Filtra apenas o mês selecionado para o resumo lateral (Sobra Mensal)
    window.dados.despesas.forEach(d => {
        if (!d.data) return;
        const dData = new Date(d.data + "T12:00:00");
        if (dData.getMonth() === mesAtual && dData.getFullYear() === anoAtual) {
            const val = window.parseNumber(d.valor);
            if (d.tipo !== "Entrada") {
                totalSaidasGeral += val;
            }
        }
    });

    // Soma o vazamento do SOS ao total de saídas
    const vazamentoSOS = window.getVazamentoSOS ? window.getVazamentoSOS() : 0;
    totalSaidasGeral += vazamentoSOS;

    sobraAtual = totalEntradasGeral - totalSaidasGeral;

    const elemSobra = document.getElementById('resultado-sobra');
    const elemLabel = document.getElementById('label-sobra');
    const elemCard = document.getElementById('status-card');

    if (elemSobra && elemLabel && elemCard) {
        if (sobraAtual < 0) {
            elemSobra.className = "valor-gigante negativo";
            elemLabel.className = "uppercase-label text-red";
            elemLabel.textContent = "Déficit Mensal (incl. Vazamento SOS)";
            elemCard.style.borderColor = "var(--accent-red)";
            elemCard.style.boxShadow = "0 8px 32px var(--glow-red)";
        } else if (sobraAtual > 0) {
            elemSobra.className = "valor-gigante positivo";
            elemLabel.className = "uppercase-label text-green";
            elemLabel.textContent = "Sobra Mensal Estimada";
            elemCard.style.borderColor = "var(--accent-green)";
            elemCard.style.boxShadow = "0 8px 32px var(--glow-green)";
        } else {
            elemSobra.className = "valor-gigante neutro";
            elemLabel.className = "uppercase-label text-muted";
            elemLabel.textContent = "Saldo Zerado";
            elemCard.style.borderColor = "var(--border-light)";
            elemCard.style.boxShadow = "none";
        }

        elemSobra.textContent = sobraAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    window.dados.metas.forEach((m, i) => {
        const valorAporte = sobraAtual > 0 ? sobraAtual * (m.porcentagemSobra / 100) : 0;
        const prog = document.getElementById(`prog-${i}`); const txt = document.getElementById(`txt-${i}`);
        if (prog && txt) { prog.value = m.valorAlvo > 0 ? (valorAporte / m.valorAlvo) * 100 : 0; txt.textContent = valorAporte.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
    });

    // 6. Atualiza Gráficos Avançados
    window.atualizarNovosGraficos();
}

window.atualizarNovosGraficos = function () {
    if (!chartDoughnut || !chartLargo || !chartArea) return;

    // Sincroniza o seletor visual do perfil se ele existir
    const elSeletorGlobal = document.getElementById('periodo-grafico-perfil');
    const modoBase = elSeletorGlobal ? elSeletorGlobal.value : window.periodosGraficos[1];

    const modo1 = modoBase; // Distribuição (Usa o global no Perfil)
    const modo2 = modoBase; // Patrimônio (Usa o global no Perfil)

    // Helper: Usar o mês selecionado como referência para os gráficos
    const agora = new Date(window.dados.anoVisualizacao, window.dados.mesVisualizacao, 1, 12, 0, 0);

    // --- LÓGICA GRÁFICO 1 (DISTRIBUIÇÃO - SEMPRE MENSAL) ---
    const mesRef = window.dados.mesVisualizacao;
    const anoRef = window.dados.anoVisualizacao;

    const despesasFiltradas = window.dados.despesas.filter(d => {
        if (!d.data) return false;
        const dt = new Date(d.data + "T12:00:00");

        if (modoBase === "custom") {
            const dIniStr = document.getElementById('data-inicio-perfil').value;
            const dFimStr = document.getElementById('data-fim-perfil').value;
            if (dIniStr && dFimStr) {
                const dIni = new Date(dIniStr + "T00:00:00");
                const dFim = new Date(dFimStr + "T23:59:59");
                return dt >= dIni && dt <= dFim && d.tipo !== "Entrada";
            }
        }

        return dt.getMonth() === mesRef && dt.getFullYear() === anoRef && d.tipo !== "Entrada";
    });

    // Agrupar por categoria para o Doughnut
    const categorias = {};
    despesasFiltradas.forEach(d => {
        const cat = d.categoria || "Geral";
        categorias[cat] = (categorias[cat] || 0) + (parseFloat(d.valor) || 0);
    });

    const labels1 = Object.keys(categorias);
    const valores1 = Object.values(categorias);
    const total1 = valores1.reduce((a, b) => a + b, 0);

    chartDoughnut.data.labels = labels1;
    chartDoughnut.data.datasets[0].data = valores1;
    chartDoughnut.update();

    // --- LÓGICA GRÁFICO LARGO (BALANÇO) ---
    // Sempre mostra Ganhos x Gastos
    let labelsLargo = [];
    let dadosGanhos = [];
    let dadosGastos = [];

    if (modo1 === "custom") {
        const dIniStr = document.getElementById('data-inicio-perfil').value;
        const dFimStr = document.getElementById('data-fim-perfil').value;

        if (dIniStr && dFimStr) {
            const dIni = new Date(dIniStr + "T00:00:00");
            const dFim = new Date(dFimStr + "T23:59:59");

            labelsLargo = ["Ganhos", "Gastos"];
            let somaGanhos = 0;
            let somaGastos = 0;

            window.dados.despesas.forEach(d => {
                if (!d.data) return;
                const dt = new Date(d.data + "T12:00:00");
                if (dt >= dIni && dt <= dFim) {
                    const val = parseFloat(d.valor) || 0;
                    if (d.tipo === "Entrada") somaGanhos += val;
                    else somaGastos += val;
                }
            });

            dadosGanhos = [somaGanhos];
            dadosGastos = [somaGastos];
            labelsLargo = ["Resultado do Período"];
        }
    } else if (modo1 === "4semanas") {
        labelsLargo = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
        dadosGanhos = [0, 0, 0, 0];
        dadosGastos = [0, 0, 0, 0];
        const mes = agora.getMonth();
        window.dados.despesas.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt.getMonth() === mes) {
                const sem = Math.min(Math.floor((dt.getDate() - 1) / 7), 3);
                const val = parseFloat(d.valor) || 0;
                if (d.tipo === "Entrada") dadosGanhos[sem] += val;
                else dadosGastos[sem] += val;
            }
        });
    } else if (modo1 === "12meses") {
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(agora.getMonth() - i);
            const mesNome = d.toLocaleString('pt-BR', { month: 'short' });
            labelsLargo.push(mesNome);

            let ganhoMes = 0, gastoMes = 0;
            window.dados.despesas.forEach(item => {
                const itDt = new Date(item.data + "T12:00:00");
                if (itDt.getMonth() === d.getMonth() && itDt.getFullYear() === d.getFullYear()) {
                    const val = parseFloat(item.valor) || 0;
                    if (item.tipo === "Entrada") ganhoMes += val;
                    else gastoMes += val;
                }
            });
            dadosGanhos.push(ganhoMes);
            dadosGastos.push(gastoMes);
        }
    } else { // anos
        const anosMap = {};
        window.dados.despesas.forEach(d => {
            const ano = new Date(d.data + "T12:00:00").getFullYear();
            if (!anosMap[ano]) anosMap[ano] = { ganho: 0, gasto: 0 };
            const val = parseFloat(d.valor) || 0;
            if (d.tipo === "Entrada") anosMap[ano].ganho += val;
            else anosMap[ano].gasto += val;
        });
        labelsLargo = Object.keys(anosMap).sort();
        dadosGanhos = labelsLargo.map(a => anosMap[a].ganho);
        dadosGastos = labelsLargo.map(a => anosMap[a].gasto);
    }

    chartLargo.data.labels = labelsLargo;
    chartLargo.data.datasets[0].data = dadosGanhos;
    chartLargo.data.datasets[1].data = dadosGastos;
    chartLargo.update();

    // --- LÓGICA GRÁFICO ÁREA (PATRIMÔNIO ACUMULADO) ---
    let labelsArea = [];
    let dadosArea = [];
    let saldoAcumulado = 0;

    if (modo2 === "4semanas") {
        labelsArea = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
        const mes = agora.getMonth();
        const sems = [0, 0, 0, 0];
        window.dados.despesas.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt.getMonth() === mes) {
                const sem = Math.min(Math.floor((dt.getDate() - 1) / 7), 3);
                const val = parseFloat(d.valor) || 0;
                sems[sem] += (d.tipo === "Entrada" ? val : -val);
            }
        });
        let curr = 0;
        dadosArea = sems.map(s => { curr += s; return curr; });
    } else if (modo2 === "12meses") {
        let tempSaldo = 0;
        // Primeiro calcula o saldo antes dos 12 meses
        const inicio12 = new Date();
        inicio12.setMonth(agora.getMonth() - 11);
        inicio12.setDate(1);

        window.dados.despesas.forEach(d => {
            const dt = new Date(d.data + "T12:00:00");
            if (dt < inicio12) {
                const val = parseFloat(d.valor) || 0;
                tempSaldo += (d.tipo === "Entrada" ? val : -val);
            }
        });

        for (let i = 11; i >= 0; i--) {
            const targetM = new Date();
            targetM.setMonth(agora.getMonth() - i);
            labelsArea.push(targetM.toLocaleString('pt-BR', { month: 'short' }));

            window.dados.despesas.forEach(d => {
                const dt = new Date(d.data + "T12:00:00");
                if (dt.getMonth() === targetM.getMonth() && dt.getFullYear() === targetM.getFullYear()) {
                    const val = parseFloat(d.valor) || 0;
                    tempSaldo += (d.tipo === "Entrada" ? val : -val);
                }
            });
            dadosArea.push(tempSaldo);
        }
    } else { // anos
        const anosSaldo = {};
        window.dados.despesas.forEach(d => {
            const ano = new Date(d.data + "T12:00:00").getFullYear();
            if (!anosSaldo[ano]) anosSaldo[ano] = 0;
            const val = parseFloat(d.valor) || 0;
            anosSaldo[ano] += (d.tipo === "Entrada" ? val : -val);
        });
        labelsArea = Object.keys(anosSaldo).sort();
        let curr = 0;
        dadosArea = labelsArea.map(a => { curr += anosSaldo[a]; return curr; });
    }

    chartArea.data.labels = labelsArea;
    chartArea.data.datasets[0].data = dadosArea;
    chartArea.update();
}
window.mudarModoLista = function (modo) {
    window.dados.modoLista = modo;
    // Atualiza classes dos botões na UI
    document.querySelectorAll('.btn-toggle-modo').forEach(btn => btn.classList.remove('ativo'));
    const btnAtivo = document.getElementById(modo === 'extenso' ? 'mode-extenso' : 'mode-resumo');
    if (btnAtivo) btnAtivo.classList.add('ativo');

    window.renderDespesas();
};

window.atualizarGraficos = window.calcularTudo;

// ====== FUNÇÕES DE INJEÇÃO HTML ======
window.renderDespesas = function () {
    const listaDespesas = document.getElementById('lista-despesas');
    if (listaDespesas) {
        // FILTRAGEM: Mostra apenas despesas do mês/ano selecionados
        const mesS = window.dados.mesVisualizacao;
        const anoS = window.dados.anoVisualizacao;

        const despesasFiltradas = window.dados.despesas
            .map((d, i) => ({ ...d, originalIndex: i })) // Preserva o índice original
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
            // LÓGICA DE RESUMO: Agrupar por CATEGORIA + TIPO (separa Entradas de Saídas)
            const resumoMap = {};
            despesasFiltradas.forEach(d => {
                // Para Entradas, agrupamos pelo NOME (fonte/descrição)
                // Para Saídas, agrupamos pela CATEGORIA
                const labelAgrupamento = d.tipo === 'Entrada' ? (d.nome || 'Fonte Desconhecida') : (d.categoria || 'Geral');
                const chave = `${d.tipo}|||${labelAgrupamento}`;

                if (!resumoMap[chave]) {
                    resumoMap[chave] = { valor: 0, tipo: d.tipo, label: labelAgrupamento };
                }
                resumoMap[chave].valor += window.parseNumber(d.valor);
            });

            const itensResumo = Object.values(resumoMap);
            const entradas = itensResumo.filter(i => i.tipo === 'Entrada').sort((a, b) => b.valor - a.valor);
            const saidas = itensResumo.filter(i => i.tipo !== 'Entrada').sort((a, b) => b.valor - a.valor);

            const renderCard = (item) => `
                <div class="card-categoria-resumo fade-in-up ${item.tipo === 'Entrada' ? 'res-entrada' : 'res-saida'}">
                    <div class="res-cap">
                        <span class="res-cat">${item.label}</span>
                        <span class="res-dot"></span>
                    </div>
                    <div class="res-val">${item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                </div>`;

            let html = '<div class="resumo-grid">';

            if (entradas.length > 0) {
                html += `<div class="resumo-secao-label resumo-label-entrada">▲ Receitas</div>`;
                html += entradas.map(renderCard).join('');
            }

            if (saidas.length > 0) {
                html += `<div class="resumo-secao-label resumo-label-saida">▼ Despesas</div>`;
                html += saidas.map(renderCard).join('');
            }

            html += '</div>';
            listaDespesas.innerHTML = html;

        } else {
            // MODO EXTENSO (Padrão/Original)
            listaDespesas.innerHTML = despesasFiltradas.map((d) => {
                let valorDisplay = (d.valor !== undefined && d.valor !== null) ? d.valor : '';
                if (valorDisplay === 0 || valorDisplay === '0') valorDisplay = '00,00';
                return `
                <div class="input-row fade-in-up ${d.tipo === 'Entrada' ? 'item-entrada' : 'item-saida'}" style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
                    <input type="date" value="${d.data || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'data', this.value)" style="flex: 1; font-size: 12px; padding: 8px !important;" title="Data">
                    <input type="text" value="${d.nome || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'nome', this.value)" style="flex: 2.2; font-size: 12px; padding: 8px !important;" placeholder="${d.tipo === 'Entrada' ? 'Fonte/Pagador' : 'Descrição'}">
                    <input type="text" list="${d.tipo === 'Entrada' ? 'opcoes-categorias-entrada' : 'opcoes-categorias-saida'}" value="${d.categoria || ''}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'categoria', this.value)" style="flex: 1.8; font-size: 12px; padding: 8px !important;" placeholder="Categoria">
                    <input type="text" value="${valorDisplay}" onchange="window.atualizarRegistroDB(${d.originalIndex}, 'valor', this.value)" style="flex: 1.2; font-size: 12px; padding: 8px !important;" placeholder="R$ 0,00">
                    <button type="button" class="btn-delete" onclick="window.deletarDespesa(${d.originalIndex})" title="Excluir" style="width: 28px; height: 28px; margin: 0; padding: 0;">✖</button>
                </div>`}).join('');
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
                <label class="uppercase-label text-muted">Aporte Mensal (% da sobra)</label>
                <input type="number" value="${m.porcentagemSobra}" onchange="window.atualizarMetaPorcentagem(${i}, this.value)">
                <progress id="prog-${i}" value="0" max="100"></progress>
            </div>`).join('');
    }
}

window.addDespesa = async function () {
    // Data padrão: Primeiro dia do mês/ano que o usuário está visualizando
    const dataPadrao = `${window.dados.anoVisualizacao}-${String(window.dados.mesVisualizacao + 1).padStart(2, '0')}-01`;

    const novoRegistro = {
        nome: "Gasto",
        valor: "00,00",
        categoria: "Geral",
        data: dataPadrao,
        tipo: "Saída"
    };

    try {
        if (typeof adicionarItem === 'function') {
            const idCriado = await adicionarItem(novoRegistro);
            novoRegistro.id = idCriado;
        }
    } catch (e) { console.error(e); }

    window.dados.despesas.push(novoRegistro);
    window.renderDespesas();
    window.agendarCalculo();
}

window.addReceita = async function () {
    // Data padrão: Primeiro dia do mês/ano que o usuário está visualizando
    const dataPadrao = `${window.dados.anoVisualizacao}-${String(window.dados.mesVisualizacao + 1).padStart(2, '0')}-01`;

    const novoRegistro = {
        nome: "Receita",
        valor: "00,00",
        categoria: "Salário",
        data: dataPadrao,
        tipo: "Entrada"
    };

    try {
        if (typeof adicionarItem === 'function') {
            const idCriado = await adicionarItem(novoRegistro);
            novoRegistro.id = idCriado;
        }
    } catch (e) { console.error(e); }

    window.dados.despesas.push(novoRegistro);
    window.renderDespesas();
    window.agendarCalculo();
}
window.addMeta = function () { window.dados.metas.push({ nome: "Nova Meta", valorAlvo: 1000, porcentagemSobra: 10 }); window.renderMetas(); window.calcularTudo(); }

window.deletarDespesa = async function (index) {
    const item = window.dados.despesas[index];

    // Deleta do BD Local
    if (item && item.id && typeof deletarItem === 'function') {
        try {
            await deletarItem(item.id);
        } catch (e) { console.error("Erro deletar do IndexedDB:", e); }
    }

    // Deleta da Memória
    window.dados.despesas.splice(index, 1);

    window.renderDespesas(); window.calcularTudo();
}

window.deletarMeta = function (index) {
    window.dados.metas.splice(index, 1);
    window.renderMetas(); window.calcularTudo();
}

window.apagarTudo = async function () {
    if (confirm("Tem certeza que deseja apagar todas as despesas e receitas? Esta ação não pode ser desfeita.")) {
        if (typeof limparTodosItens === 'function') {
            await limparTodosItens();
        } else if (typeof deletarItem === 'function') {
            for (let d of window.dados.despesas) {
                if (d.id) await deletarItem(d.id);
            }
        }
        window.dados.despesas = [];

        // Limpar também o SOS (Vazamentos)
        window.dados.sosCalc = { divida: '', juros: '', futilidades: '' };
        localStorage.removeItem("FinanzaSOS");

        if (document.getElementById('sos-divida')) document.getElementById('sos-divida').value = '';
        if (document.getElementById('sos-juros')) document.getElementById('sos-juros').value = '';
        if (document.getElementById('sos-futilidades')) document.getElementById('sos-futilidades').value = '';
        if (document.getElementById('sos-prejuizo-resultado')) {
            document.getElementById('sos-prejuizo-resultado').textContent = 'R$ 0,00';
            document.getElementById('sos-prejuizo-resultado').style.textShadow = 'none';
            document.getElementById('sos-prejuizo-resultado').style.color = 'var(--text-main)';
        }

        // Assegura que o vazamento local seja zerado antes do cálculo total
        if (window.calcularVazamentoSOS) window.calcularVazamentoSOS();

        window.renderDespesas();
        window.calcularTudo();

        // Assegura que todas as alterações sejam gravadas na nuvem se o usuário estiver logado
        if (typeof window.salvarDadosNuvem === 'function') {
            window.salvarDadosNuvem();
        }

        alert("Todos os dados foram apagados com sucesso.");
    }
}

// ====== INTERAÇÃO COM O DOM & EVENTOS ======

// 1. Avatar Clicável (Redireciona para o Perfil do Usuário)
const avatarFoto = document.getElementById('foto-usuario');
if (avatarFoto) {
    avatarFoto.style.cursor = "pointer";
    avatarFoto.addEventListener('click', function () {
        window.mudarMenu('usuario', null);
    });
}

// 2. Botão de Logout (Sair)
const btnSair = document.getElementById('btn-sair');
if (btnSair) {
    btnSair.addEventListener('click', async function () {
        // Desloga do Supabase e limpa sessão local
        await supabase.auth.signOut();
        localStorage.removeItem("SessaoFinanza");
        window.location.href = "../Login/login.html";
    });
}
// ====================================================================
// ====== 4. IMPORTAÇÃO E EXPORTAÇÃO DE DADOS (EXTRATOS E RELATÓRIOS) =
// ====================================================================

// 4.1 Regras para Categorização Automática
const regrasCategorias = {
    "IFOOD": "Alimentação", "MCDONALDS": "Alimentação", "BURGER": "Alimentação", "RESTAURANTE": "Alimentação",
    "UBER": "Transporte", "POSTO": "Transporte", "99APP": "Transporte",
    "NETFLIX": "Lazer", "AMAZON": "Lazer", "SPOTIFY": "Lazer", "CINEMA": "Lazer",
    "PAG SEGURO": "Serviços", "ENERGIA": "Moradia", "AGUA": "Moradia", "CONDOMINIO": "Moradia"
};

function categorizarGastoAutomaticamente(descricao) {
    const desc = descricao.toUpperCase();
    for (const [palavraChave, categoria] of Object.entries(regrasCategorias)) {
        if (desc.includes(palavraChave)) {
            return categoria;
        }
    }
    return "Outros";
}

// 4.2 Importação Segura do Extrato (CSV)
window.importarExtratoCSV = function (inputElement) {
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

        // Tenta achar colunas ativamente olhando o cabeçalho (Aumentado para 50 linhas para suportar metadados do NuBank)
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

        let extratoMes = window.dados.mesVisualizacao;
        let extratoAno = window.dados.anoVisualizacao;

        // Tenta achar a verdadeira data referencial do Arquivo (Focando nas primeiras linhas válidas pós-cabeçalho)
        let searchStart = headerLineIdx !== -1 ? headerLineIdx + 1 : 0;
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

        // Descobre em que linha começar a processar (pula cabeçalho se achou)
        let linhaInicial = achouCabecalho ? headerLineIdx + 1 : 1;
        if (!achouCabecalho) {
            let colZero = linhasVidas[0][idxData] || "";
            if (colZero.includes('/') && /\d/.test(colZero)) {
                linhaInicial = 0; // Primeira linha é dado real!
            }
        }

        let arquivoTemNegativos = false;
        for (let i = linhaInicial; i < linhasVidas.length; i++) {
            if (linhasVidas[i][idxValor] && linhasVidas[i][idxValor].includes('-')) {
                arquivoTemNegativos = true;
                break;
            }
        }

        for (let i = linhaInicial; i < linhasVidas.length; i++) {
            const colunas = linhasVidas[i];
            if (colunas.length <= idxValor || colunas.length <= idxData) continue;

            let dataOriginal = colunas[idxData];
            const lancamento = colunas[idxLanc] || "";
            const detalhes = colunas[idxDetalhes] || "";
            const valorStr = colunas[idxValor] || "";

            if (!dataOriginal || !valorStr) continue;

            const lancUpper = lancamento.toUpperCase();
            if (lancUpper.includes('SALDO DO DIA') || lancUpper.replace(/\s/g, '') === 'SALDO') {
                continue;
            }

            // Engine Universal de Limpeza Númerica Monetária
            let cleanVal = valorStr.replace('R$', '').replace(/\s/g, '').trim();
            let isTrailingNegative = cleanVal.endsWith('-');
            if (isTrailingNegative) cleanVal = '-' + cleanVal.slice(0, -1);

            if (cleanVal.includes(',') && cleanVal.includes('.')) {
                let lastComma = cleanVal.lastIndexOf(',');
                let lastDot = cleanVal.lastIndexOf('.');
                if (lastComma > lastDot) cleanVal = cleanVal.replace(/\./g, '').replace(',', '.'); // Ex: 1.000,50 -> 1000.50
                else cleanVal = cleanVal.replace(/,/g, ''); // Ex: 1,000.50 -> 1000.50
            } else if (cleanVal.includes(',')) {
                cleanVal = cleanVal.replace(',', '.');
            }

            let valorNumerico = parseFloat(cleanVal);
            if (isNaN(valorNumerico) || valorNumerico === 0) continue;

            // Extração do Horário e Limpeza (Lógica do Usuário)
            let hora = "";
            let desc = detalhes;

            let matchTime = detalhes.match(/(\d{2}:\d{2})/);
            if (matchTime) {
                hora = matchTime[1];
            }

            let matchFull = detalhes.match(/^(\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+(.+)/);
            if (matchFull) {
                let info = matchFull[3];
                info = info.replace(/^\d+\s+/, ''); // Limpa CPFs/IDs
                desc = info;
            }

            let finalNome = lancamento;
            if (desc && desc !== lancamento) {
                finalNome = desc + " - " + lancamento;
            }

            // Exceção do Saldo Anterior (nome limpo)
            if (lancUpper.includes('SALDO ANTERIOR')) {
                finalNome = "Saldo Anterior";
                dataOriginal = `01/${String(extratoMes + 1).padStart(2, '0')}/${extratoAno}`;
            }

            // Formatação Universal de Data Iso (YYYY-MM-DD)
            let dataIso = dataOriginal;
            if (dataOriginal.includes('/')) {
                const parts = dataOriginal.split('/');
                if (parts.length === 3) {
                    let ano = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                    dataIso = `${ano}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else if (parts.length === 2) {
                    dataIso = `${new Date().getFullYear()}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            } else if (dataOriginal.includes('-')) {
                dataIso = dataOriginal;
            }

            // Tipo / Sinal (Aproveitamos a checagem manual que já funcionava ou o sinal)
            let tipoReal = "Saída";
            const isEntradaKeyword = ['SALARIO', 'RECEBID', 'ESTORNO', 'RENDIMENTO', 'TED RECEB', 'PIX RECEB', 'REEMBOLSO', 'SALDO ANTERIOR'].some(k => lancUpper.includes(k));

            const isNegativo = valorStr.includes('-') || valorStr.includes('D');

            if (isNegativo) {
                tipoReal = "Saída";
            } else if (valorStr.includes('+') || valorStr.includes('C') || isEntradaKeyword) {
                tipoReal = "Entrada";
            } else if (arquivoTemNegativos && valorNumerico > 0) {
                tipoReal = "Entrada";
            }

            valorNumerico = Math.abs(valorNumerico);

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

            const objDadoPlanilha = {
                nome: finalNome,
                horario: hora,
                valor: valorNumerico,
                categoria: categorizarGasto(finalNome),
                data: dataIso,
                tipo: tipoReal
            };

            // Salvar no Banco de Dados
            if (typeof adicionarItem === 'function') {
                adicionarItem(objDadoPlanilha).then(id => {
                    objDadoPlanilha.id = id;
                });
            }

            window.dados.despesas.push(objDadoPlanilha);
            totalImportadosSucedidos++;

            if (dataIso) {
                try {
                    const dt = new Date(dataIso + "T12:00:00");
                    if (dt.getMonth() === extratoMes && dt.getFullYear() === extratoAno) {
                        itensMesAtual++;
                    } else {
                        itensOutrosPeriodos++;
                    }
                } catch (e) { itensOutrosPeriodos++; }
            }
        }

        if (totalImportadosSucedidos > 0) {
            window.dados.mesVisualizacao = extratoMes;
            window.dados.anoVisualizacao = extratoAno;
            const seletorM = document.getElementById('seletor-mes');
            if (seletorM) seletorM.value = extratoMes;
            const seletorA = document.getElementById('seletor-ano');
            if (seletorA) seletorA.value = extratoAno;

            window.renderDespesas();
            window.calcularTudo();

            let msg = `✅ ${totalImportadosSucedidos} registros importados com sucesso!`;
            if (itensOutrosPeriodos > 0) {
                msg += `\n\nℹ️ Foram adicionados ${itensMesAtual} itens a esse mês e ${itensOutrosPeriodos} as parcelas de outros períodos.`;
            }
            alert(msg);
        } else {
            alert("⚠️ Nenhum registro válido encontrado. Verifique as configurações de exportação.");
        }

        inputElement.value = "";
    };

    reader.readAsText(arquivo, 'ISO-8859-1');
};

// 4.3 Exportar Planilha (CSV)
window.exportarCSV = function () {
    if (window.dados.despesas.length === 0) {
        alert("Não há despesas registradas para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Tipo,Nome do Gasto,Categoria,Valor (R$)\n";

    window.dados.despesas.forEach(despesa => {
        let dia = despesa.data ? despesa.data : "";
        let tipo = despesa.tipo ? despesa.tipo : "Saída";
        let nome = despesa.nome ? despesa.nome.replace(/,/g, " ") : "Sem nome";
        let categoria = despesa.categoria ? despesa.categoria : "Sem Categoria";
        let valor = despesa.valor ? despesa.valor.toFixed(2) : "0.00";

        // Se for expor novamente ao CSV, colocar que a saída é negativa para fins estéticos (opcional)
        let formattedValor = tipo === "Saída" ? `-${valor}` : valor;

        csvContent += `${dia},${tipo},${nome},${categoria},${formattedValor}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Meus_Gastos_Finanza.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 4.4 Exportar Relatório Visula (PDF)
window.exportarPDF = function (botaoElement) {
    if (typeof html2pdf === "undefined") {
        alert("Erro: A biblioteca de geração de PDF ainda está carregando ou não foi encontrada.");
        return;
    }

    // Tira uma "foto" de todo o painel operacional para o PDF
    const elemento = document.getElementById('tela-operacional');

    const textoOriginal = botaoElement.innerHTML;
    botaoElement.innerHTML = "⏳ Gerando PDF...";

    const opcoes = {
        margin: 5,
        filename: 'Relatorio_Finanza.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#101012" }, // Respeita seu tema escuro
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'portrait' }
    };

    html2pdf().set(opcoes).from(elemento).save().then(() => {
        botaoElement.innerHTML = textoOriginal; // Restaura o botão
    });
}
// ====================================================================
// ====== 6. LÓGICA DO SOS FINANCEIRO =================================
// ====================================================================

// Retorna o valor numérico do vazamento para uso no calcularTudo
window.getVazamentoSOS = function () {
    const calc = window.dados.sosCalc;
    if (!calc) return 0;
    const divida = parseFloat(calc.divida) || 0;
    const juros = parseFloat(calc.juros) || 0;
    const futilidades = parseFloat(calc.futilidades) || 0;
    return (divida * (juros / 100)) + futilidades;
};

window.salvarSOSLocal = function () {
    localStorage.setItem("FinanzaSOS", JSON.stringify({
        checklist: window.dados.sosChecklist,
        calc: window.dados.sosCalc
    }));
};

// Carrega dados do SOS do localStorage (chamado na inicialização)
window.carregarSOSLocal = function () {
    const salvo = localStorage.getItem("FinanzaSOS");
    if (!salvo) return;
    try {
        const parsed = JSON.parse(salvo);
        if (parsed.checklist && Array.isArray(parsed.checklist)) {
            window.dados.sosChecklist = parsed.checklist;
        }
        if (parsed.calc) {
            window.dados.sosCalc = parsed.calc;
        }
    } catch (e) { }
};

// Inicializa os dados do SOS ao carregar a página
window.carregarSOSLocal();

window.renderChecklistSOS = function () {
    const lista = document.getElementById('lista-checklist-sos');
    if (!lista) return;

    if (!window.dados.sosChecklist || !Array.isArray(window.dados.sosChecklist)) {
        window.dados.sosChecklist = [
            { texto: "Listar e somar todas as dívidas ativas", checked: false },
            { texto: "Interromper o uso de novos cartões de crédito", checked: false },
            { texto: "Cancelar agora as assinaturas não-essenciais", checked: false },
            { texto: "Ligar para o banco e renegociar taxas de juros", checked: false },
            { texto: "Direcionar qualquer sobra para quitar a dívida mais cara", checked: false }
        ];
    }

    lista.innerHTML = window.dados.sosChecklist.map((item, i) => {
        const isChecked = item.checked ? 'checked' : '';
        // Usamos um campo de input com borda transparente para seguir a lógica das "despesas"
        return `
            <div class="chk-item ${isChecked}" style="width: 100%;">
                <div class="chk-box" onclick="window.toggleChecklistSOS(${i})" style="flex-shrink: 0;"></div>
                <input type="text" value="${item.texto}" onchange="window.atualizarTextoChecklistSOS(${i}, this.value)" 
                    style="flex: 1; background: transparent; border: none; color: inherit; padding: 5px; font-size: 14px; outline: none; margin: 0; box-shadow: none;" 
                    placeholder="Descreva a ação de resgate...">
                <button type="button" class="btn-delete" onclick="window.deletarItemChecklistSOS(${i})" title="Excluir passo" style="flex: 0 0 auto; width: 30px; height: 30px; margin: 0; padding: 0; font-size: 13px;">✖</button>
            </div>
        `;
    }).join('');

    // Atualiza Barra de Progresso do SOS
    const total = window.dados.sosChecklist.length;
    const concluidos = window.dados.sosChecklist.filter(it => it.checked).length;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const badge = document.getElementById('sos-progress-badge');
    if (badge) badge.textContent = `${pct}% Concluído`;
};

window.atualizarTextoChecklistSOS = function (index, texto) {
    if (!window.dados.sosChecklist[index]) return;
    window.dados.sosChecklist[index].texto = texto;
    window.salvarSOSLocal();
};

window.toggleChecklistSOS = function (index) {
    if (!window.dados.sosChecklist[index]) return;
    window.dados.sosChecklist[index].checked = !window.dados.sosChecklist[index].checked;
    window.renderChecklistSOS();
    window.salvarSOSLocal();
};

window.addItemChecklistSOS = function () {
    // Adiciona uma linha em branco igual à de despesas, sem usar prompt
    window.dados.sosChecklist.push({ texto: '', checked: false });
    window.renderChecklistSOS();
    window.salvarSOSLocal();
};

window.deletarItemChecklistSOS = function (index) {
    window.dados.sosChecklist.splice(index, 1);
    window.renderChecklistSOS();
    window.salvarSOSLocal();
};

window.syncSOS = function (origem) {
    const sD = document.getElementById('sos-divida-slider');
    const iD = document.getElementById('sos-divida-input');

    if (origem === 'slider' && sD && iD) {
        iD.value = sD.value;
    } else if (origem === 'input' && sD && iD) {
        sD.value = iD.value;
    }

    window.atualizarDadosSOS();
};

window.atualizarDadosSOS = function () {
    if (!window.dados.sosCalc) {
        window.dados.sosCalc = { divida: 0, juros: 0, futilidades: 0 };
    }

    const iD = document.getElementById('sos-divida-input');
    const sJ = document.getElementById('sos-juros-slider');
    const iF = document.getElementById('sos-futilidades');

    const vD = iD ? parseFloat(iD.value) : 0;
    const vJ = sJ ? parseFloat(sJ.value) : 0;
    const vF = iF ? parseFloat(iF.value) : 0;

    window.dados.sosCalc.divida = vD;
    window.dados.sosCalc.juros = vJ;
    window.dados.sosCalc.futilidades = vF;

    // Atualiza labels de exibição (Juros)
    const lblJ = document.getElementById('val-juros');
    if (lblJ) lblJ.textContent = vJ + '%';

    window.salvarSOSLocal();
    window.calcularVazamentoSOS();
    window.agendarCalculo();
};

window.carregarVazamentoSOS = function () {
    if (!window.dados.sosCalc) {
        window.dados.sosCalc = { divida: 0, juros: 0, futilidades: 0 };
    }

    const sD = document.getElementById('sos-divida-slider');
    const iD = document.getElementById('sos-divida-input');
    const sJ = document.getElementById('sos-juros-slider');
    const iF = document.getElementById('sos-futilidades');

    if (sD) sD.value = window.dados.sosCalc.divida || 0;
    if (iD) iD.value = window.dados.sosCalc.divida || 0;
    if (sJ) sJ.value = window.dados.sosCalc.juros || 0;
    if (iF) iF.value = window.dados.sosCalc.futilidades || 0;

    window.atualizarDadosSOS();
};

window.calcularVazamentoSOS = function () {
    const vazamentoTotal = window.getVazamentoSOS();
    const resultado = document.getElementById('sos-prejuizo-resultado');
    if (resultado) {
        resultado.textContent = vazamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resultado.style.color = vazamentoTotal > 300 ? '#ff3388' : (vazamentoTotal > 0 ? '#FFA500' : 'var(--text-main)');

        const barV = document.getElementById('vazamento-bar');
        if (barV) {
            const pct = Math.min((vazamentoTotal / 2000) * 100, 100);
            barV.style.width = pct + '%';
        }
    }

    // Cálculo de Autonomia
    const autonRes = document.getElementById('sos-autonomia-resultado');
    if (autonRes) {
        const sobra = window.sobraAtual || 0;
        const divida = parseFloat(window.dados.sosCalc.divida) || 0;
        const jurosMensal = (parseFloat(window.dados.sosCalc.juros) || 0) / 100;

        let pctAuton = 0;
        if (divida <= 0) {
            autonRes.textContent = "Sem Dívida";
            autonRes.style.color = "var(--accent-green)";
            pctAuton = 100;
        } else if (sobra <= 0) {
            autonRes.textContent = "Crítico";
            autonRes.style.color = "var(--accent-red)";
            pctAuton = 5;
        } else {
            const custoJuros = divida * jurosMensal;
            if (custoJuros <= 0) {
                autonRes.textContent = "Estável";
                autonRes.style.color = "var(--accent-green)";
                pctAuton = 100;
            } else {
                const multi = (sobra / custoJuros);
                autonRes.textContent = multi.toFixed(1) + "x Juros";
                autonRes.style.color = multi < 1 ? "var(--accent-red)" : (multi < 3 ? "var(--accent-blue)" : "var(--accent-green)");
                pctAuton = Math.min((multi / 5) * 100, 100);
            }
        }
        const barA = document.getElementById('autonomia-bar');
        if (barA) barA.style.width = pctAuton + '%';
    }
};

window.mudarPassoSOS = function (passo) {
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`step-${passo}`);
    if (target) target.classList.add('active');

    const tipText = document.getElementById('sos-tip-text');
    const tips = {
        1: "Foco inicial: Identifique todos os gastos recorrentes e cancele o que não for vital para sobrevivência.",
        2: "Hora de agir: Venda itens que não usa, busque rendas extras pontuais e renegocie prazos de dívidas curtas.",
        3: "Horizonte: Assim que o vazamento estancar, dedique 10% da sua sobra para reconstruir sua reserva de emergência."
    };
    if (tipText) tipText.textContent = tips[passo];
};

window.simularAcaoSOS = function (tipo) {
    const sD = document.getElementById('sos-divida-slider');
    const sJ = document.getElementById('sos-juros-slider');
    const iF = document.getElementById('sos-futilidades');

    if (tipo === 'streaming') {
        if (iF) iF.value = Math.max(0, (parseFloat(iF.value) || 0) - 50);
    } else if (tipo === 'delivery') {
        if (iF) iF.value = Math.max(0, (parseFloat(iF.value) || 0) - 200);
    } else if (tipo === 'renegotiate') {
        if (sJ) sJ.value = Math.max(0, (parseFloat(sJ.value) || 0) - 2);
    }

    window.atualizarDadosSOS();

    // Feedback visual rápido
    const card = document.querySelector('.inner-calc');
    if (card) {
        card.style.borderColor = 'var(--accent-green)';
        setTimeout(() => card.style.borderColor = 'rgba(255, 102, 119, 0.2)', 500);
    }
};

window.exportarPlanilhaResgate = function () {
    const calc = window.dados.sosCalc;
    const checklist = window.dados.sosChecklist;

    let csv = "\uFEFF";
    csv += "PLANO DE RESGATE FINANZA\n\n";
    csv += "DIAGNOSTICO DA DIVIDA\n";
    csv += `Divida Total;R$ ${calc.divida || 0}\n`;
    csv += `Juros Mensal;${calc.juros || 0}%\n`;
    csv += `Gastos Futeis Identificados;R$ ${calc.futilidades || 0}\n`;
    csv += `Vazamento Mensal Estimado;R$ ${window.getVazamentoSOS().toFixed(2)}\n\n`;

    csv += "CHECKLIST DE ACOES\n";
    csv += "Status;Acao\n";
    checklist.forEach(it => {
        csv += `${it.checked ? "[CONCLUIDO]" : "[PENDENTE]"};${it.texto}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Plano_Resgate_Finanza.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};