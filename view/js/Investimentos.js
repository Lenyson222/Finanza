import { renderHeader, validarAcesso } from './header.js';



window.atualizarGraficoInvestimentos = function () {
    const ativoElement = document.getElementById('ativo-investimento');
    const containerId = 'tradingview_investimentos_container';
    if (!ativoElement) return;

    const symbol = ativoElement.value || "BMFBOVESPA:PETR4";
    const tvContainer = document.getElementById(containerId);
    if (tvContainer) tvContainer.innerHTML = '';

    if (typeof TradingView !== "undefined" && tvContainer) {
        new TradingView.widget({
            "autosize": true, 
            "symbol": symbol, 
            "interval": "D", 
            "timezone": "America/Sao_Paulo", 
            "theme": "dark", 
            "style": "1", 
            "locale": "br", 
            "enable_publishing": false, 
            "backgroundColor": "rgba(18, 18, 24, 0.65)", 
            "gridColor": "rgba(255, 255, 255, 0.05)", 
            "hide_top_toolbar": false, 
            "hide_volume": true, 
            "save_image": false, 
            "container_id": containerId
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const acessoOk = await validarAcesso();
    if (!acessoOk) return;

    window.atualizarGraficoInvestimentos();
});
