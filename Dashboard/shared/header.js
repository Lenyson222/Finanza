// shared/header.js

export function renderHeader(sectionId) {
    const headerHTML = `
    <header class="glass-header">
        <div class="header-logo-wrapper">
            <img src="../../logopn.png" alt="Logo Finanza">
            <h1 class="glow-text-blue" style="font-size: 24px; margin: 0; letter-spacing: -0.5px;">FINANZA</h1>
        </div>

        <nav class="nav-menu" id="nav-principal" role="navigation">
            <a href="../Inicio/Inicio.html" id="nav-inicio" class="nav-link ${sectionId === 'inicio' ? 'ativo' : ''}">
                <span class="nav-label">Início</span>
            </a>
            <a href="../Metas/Metas.html" id="nav-meta" class="nav-link ${sectionId === 'meta' ? 'ativo' : ''}">
                <span class="nav-label">Metas</span>
            </a>
            <a href="../Cotacoes/Cotacoes.html" id="nav-cotacao" class="nav-link ${sectionId === 'cotacao' ? 'ativo' : ''}">
                <span class="nav-label">Cotações</span>
            </a>
            <a href="../Investimentos/Investimentos.html" id="nav-investimento" class="nav-link ${sectionId === 'investimento' ? 'ativo' : ''}">
                <span class="nav-label">Investimentos</span>
            </a>
            <a href="../Sos/Sos.html" id="nav-sos" class="nav-link nav-sos ${sectionId === 'sos' ? 'ativo' : ''}">
                <span class="nav-label">SOS</span>
            </a>
            <a href="../Perfil/Perfil.html" id="nav-usuario" class="nav-link ${sectionId === 'usuario' ? 'ativo' : ''}">
                <span class="nav-label">Perfil</span>
            </a>
        </nav>

        <div class="perfil-usuario" onclick="window.location.href='../Perfil/Perfil.html'">
            <span id="nome-usuario" class="user-name">Carregando...</span>
            <img id="foto-usuario" class="foto-perfil" src="" alt="Foto de Perfil" style="display: none;">
        </div>
    </header>
    `;
    
    // Injeta em um container específico ou no topo do body
    const container = document.getElementById('header-container');
    if (container) {
        container.innerHTML = headerHTML;
    }

    // Inicializa os dados visuais base do usuário no Header
    const sessaoString = localStorage.getItem("SessaoFinanza") || '{"tipo":"convidado","nome":"Convidado"}';
    const usuarioAtivo = JSON.parse(sessaoString);
    const elNome = document.getElementById('nome-usuario');
    const elFoto = document.getElementById('foto-usuario');
    
    if (elNome && usuarioAtivo.nome) elNome.textContent = `Olá, ${usuarioAtivo.nome.split(' ')[0]}`;
    if (elFoto && usuarioAtivo.foto) {
        elFoto.src = usuarioAtivo.foto;
        elFoto.style.display = 'block';
    }
}

// 2. SISTEMA DE PROTEÇÃO DE ACESSO (Transferido do Dashboard.js original)
export async function validarAcesso() {
    const supabaseInst = window.supabaseClient;
    if (!supabaseInst) {
        console.warn("Supabase Client não encontrado.");
    }

    try {
        const { data: { session } } = supabaseInst ? await supabaseInst.auth.getSession() : { data: { session: null } };
        const sessaoLocal = localStorage.getItem("SessaoFinanza");

        if (!session && !sessaoLocal) {
            window.location.href = "../../Login/login.html";
            return false;
        }

        if (session) {
            const user = session.user;
            const dadosSessao = {
                tipo: "google",
                uid: user.id,
                nome: user.user_metadata.full_name || user.email,
                foto: user.user_metadata.avatar_url || "",
                email: user.email
            };
            localStorage.setItem("SessaoFinanza", JSON.stringify(dadosSessao));
        }
        return true;
    } catch (err) {
        console.error("Erro na validação de acesso:", err);
        return false;
    }
}

// Utilitário Global para Formatação e Parse Numérico
export function parseNumber(val) {
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
}

window.parseNumber = parseNumber;
window.validarAcesso = validarAcesso;

