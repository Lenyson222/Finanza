// controller.js
// Ponte entre o HTML e o db.js

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicia o banco de dados ao carregar a página
    try {
        await iniciarBanco();
        console.log("Banco IndexedDB iniciado e pronto para uso.");
        // Atualiza a lista na tela logo de cara
        await atualizarListaNaTela();
    } catch (e) {
        console.error("Falha ao iniciar IndexedDB.", e);
    }

    // 2. Escuta o envio do formulário do projeto
    const formAtividade = document.getElementById("form-registro-local");
    if (formAtividade) {
        formAtividade.addEventListener("submit", async (evento) => {
            evento.preventDefault(); // Impede do navegador recarregar a tela

            // 3. Captura os dados do formulário
            const nomeStr = document.getElementById("registro-nome").value;
            const dataStr = document.getElementById("registro-data").value;
            const categoriaStr = document.getElementById("registro-categoria").value;

            // 4. Monta um objeto com as chaves corretas
            const novoItem = {
                nome: nomeStr,
                data: dataStr,
                categoria: categoriaStr
            };

            // 5. Envia o objeto para a função de salvar do db.js
            try {
                const idCriado = await adicionarItem(novoItem);
                console.log("Item salvo no IndexedDB com ID:", idCriado);

                // Limpa o formulário
                formAtividade.reset();

                // Ao final, lista os dados salvos novamente na tela
                await atualizarListaNaTela();

            } catch (error) {
                console.error("Erro ao salvar objeto no IndexedDB:", error);
            }
        });
    }
});

/**
 * Atualizar Lista na Tela:
 * Busca todos os itens no db e renderiza as divs no DOM.
 */
async function atualizarListaNaTela() {
    try {
        const itens = await buscarItens();
        const containerLista = document.getElementById("lista-dados-salvos");

        if (!containerLista) return;

        // Limpamos o html existente do container
        containerLista.innerHTML = "";

        if (itens.length === 0) {
            containerLista.innerHTML = "<p class='text-muted'>Nenhum registro local encontrado.</p>";
            return;
        }

        // Criamos os blocos HTML um por um e injetamos
        itens.forEach((item) => {
            const divCard = document.createElement("div");
            divCard.className = "item-registrado card glass-card";
            divCard.style.padding = "15px";
            divCard.style.marginBottom = "10px";
            divCard.style.display = "flex";
            divCard.style.justifyContent = "space-between";
            divCard.style.alignItems = "center";

            // Formatando a data do html input (YYYY-MM-DD) para pt-BR
            const dia = item.data.split("-")[2] || "00";
            const mes = item.data.split("-")[1] || "00";
            const ano = item.data.split("-")[0] || "0000";

            divCard.innerHTML = `
                <div>
                    <h4 class="text-green" style="margin-bottom: 5px">${item.nome}</h4>
                    <span class="badge" style="background: rgba(51, 224, 255, 0.1); color: var(--accent-blue);">📅 ${dia}/${mes}/${ano}</span>
                    <span class="badge" style="background: rgba(165, 94, 234, 0.1); color: var(--accent-purple); margin-left: 5px;">🏷️ ${item.categoria}</span>
                </div>
                <button class="btn-delete" title="Excluir do local" onclick="excluirItemLocal(${item.id})">✖</button>
            `;

            containerLista.appendChild(divCard);
        });

    } catch (e) {
        console.error("Erro ao desenhar lista na tela:", e);
    }
}

/**
 * Função global atrelada ao botão "✖" para apagar um item específico.
 */
window.excluirItemLocal = async function (idObjectStore) {
    if (confirm("Tem certeza que deseja apagar esse registro do IndexedDB?")) {
        try {
            await deletarItem(idObjectStore);
            console.log("Removido com sucesso:", idObjectStore);
            // Atualiza de novo...
            await atualizarListaNaTela();
        } catch (e) {
            console.error("Erro ao deletar o ID: " + idObjectStore, e);
        }
    }
};