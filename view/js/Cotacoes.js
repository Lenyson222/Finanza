import { renderHeader, validarAcesso } from './header.js';



window.populaSelectsMoedas = function () {
    const top25Moedas = [
        { code: "USD", name: "Dólar Americano" }, { code: "EUR", name: "Euro" },
        { code: "BTC", name: "Bitcoin" }, { code: "BRL", name: "Real Brasileiro" },
        { code: "GBP", name: "Libra Esterlina" }, { code: "JPY", name: "Iene Japonês" },
        { code: "CHF", name: "Franco Suíço" }, { code: "AUD", name: "Dólar Australiano" },
        { code: "CAD", name: "Dólar Canadense" }, { code: "CNY", name: "Yuan Chinês" },
        { code: "ARS", name: "Peso Argentino" }
    ];

    const m1 = document.getElementById('moeda1');
    const m2 = document.getElementById('moeda2');
    if (!m1 || !m2) return;

    m1.innerHTML = ''; m2.innerHTML = '';

    top25Moedas.forEach(m => {
        m1.innerHTML += `<option value="${m.code}">${m.name} (${m.code})</option>`;
        m2.innerHTML += `<option value="${m.code}">${m.name} (${m.code})</option>`;
    });

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
            "autosize": true, "symbol": moeda1 + moeda2, "interval": "D", "timezone": "America/Sao_Paulo", "theme": "dark", "style": "1", "locale": "br", "enable_publishing": false, "backgroundColor": "rgba(18, 18, 24, 0.65)", "gridColor": "rgba(0, 0, 0, 0.0)", "hide_top_toolbar": false, "hide_volume": true, "save_image": false, "container_id": "tradingview_container"
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

document.addEventListener('DOMContentLoaded', async () => {
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;

    window.populaSelectsMoedas();
    window.atualizarGraficoTV();
    window.buscarCotacoes();
});
