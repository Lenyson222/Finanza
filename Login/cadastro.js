// cadastro.js — Lógica da tela de cadastro

// ─── Toggle visibilidade da senha ───────────────────────────────────────────
function criarToggleSenha(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', () => {
        const visible = inp.type === 'text';
        inp.type = visible ? 'password' : 'text';
        btn.textContent = visible ? '👁' : '🙈';
    });
}

criarToggleSenha('btn-toggle-cad-senha', 'cad-senha');
criarToggleSenha('btn-toggle-cad-confirma', 'cad-confirma');

// ─── Indicador de força da senha ─────────────────────────────────────────────
const inputSenha = document.getElementById('cad-senha');
const forcaBarra = document.getElementById('forca-barra');
const forcaLabel = document.getElementById('forca-label');

function calcularForca(senha) {
    let pontos = 0;
    if (senha.length >= 6) pontos++;
    if (senha.length >= 10) pontos++;
    if (/[A-Z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;
    return pontos;
}

if (inputSenha && forcaBarra && forcaLabel) {
    inputSenha.addEventListener('input', () => {
        const val = inputSenha.value;
        if (!val) {
            forcaBarra.style.width = '0%';
            forcaLabel.textContent = '';
            forcaLabel.style.color = 'var(--text-muted)';
            return;
        }
        const pts = calcularForca(val);
        const niveis = [
            { label: 'Muito fraca', cor: '#ff3366', pct: '20%' },
            { label: 'Fraca', cor: '#ff6677', pct: '35%' },
            { label: 'Razoável', cor: '#ffaa00', pct: '55%' },
            { label: 'Boa', cor: '#33e0ff', pct: '75%' },
            { label: 'Excelente', cor: '#33ffb8', pct: '100%' },
        ];
        const nivel = niveis[Math.min(pts - 1, 4)] || niveis[0];
        forcaBarra.style.width = nivel.pct;
        forcaBarra.style.background = nivel.cor;
        forcaLabel.textContent = nivel.label;
        forcaLabel.style.color = nivel.cor;
    });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function mostrarErro(msg) {
    const el = document.getElementById('msg-erro-cadastro');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function ocultarErro() {
    const el = document.getElementById('msg-erro-cadastro');
    if (el) el.classList.add('hidden');
}

function setCarregando(btn, estado) {
    if (!btn) return;
    btn.disabled = estado;
    btn.style.opacity = estado ? '0.7' : '1';
    btn.style.cursor = estado ? 'wait' : 'pointer';
    btn.textContent = estado ? '⏳ Criando conta...' : '✨ Criar minha conta';
}

// ─── Envio do formulário ─────────────────────────────────────────────────────
const formCadastro = document.getElementById('form-cadastro');

if (formCadastro) {
    formCadastro.addEventListener('submit', async function (e) {
        e.preventDefault();
        ocultarErro();

        const nome = document.getElementById('cad-nome').value.trim();
        const email = document.getElementById('cad-email').value.trim();
        const senha = document.getElementById('cad-senha').value;
        const confirma = document.getElementById('cad-confirma').value;
        const btn = document.getElementById('btn-cadastrar');

        // ─── Validações locais ───
        if (!nome) {
            mostrarErro('Por favor, informe seu nome completo.');
            document.getElementById('cad-nome').focus();
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarErro('Por favor, informe um e-mail válido.');
            document.getElementById('cad-email').focus();
            return;
        }

        if (senha.length < 6) {
            mostrarErro('A senha precisa ter pelo menos 6 caracteres.');
            document.getElementById('cad-senha').focus();
            return;
        }

        if (senha !== confirma) {
            mostrarErro('As senhas não coincidem. Verifique e tente novamente.');
            document.getElementById('cad-confirma').focus();
            return;
        }

        setCarregando(btn, true);

        try {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password: senha,
                options: {
                    data: {
                        full_name: nome,
                        display_name: nome
                    }
                }
            });

            if (error) {
                if (error.message.includes('User already registered')) {
                    mostrarErro('Este e-mail já está cadastrado. Tente fazer login.');
                } else if (error.message.includes('Password should be')) {
                    mostrarErro('A senha é muito fraca. Use pelo menos 6 caracteres, incluindo letras e números.');
                } else {
                    mostrarErro('Erro ao criar conta: ' + error.message);
                }
                setCarregando(btn, false);
                return;
            }

            // Cadastro feito! Supabase normalmente envia e-mail de confirmação.
            // Redireciona para login com toast de sucesso.
            window.location.href = 'login.html?cadastro=ok';

        } catch (err) {
            console.error('Erro no cadastro:', err);
            mostrarErro('Ocorreu um erro inesperado. Tente novamente.');
            setCarregando(btn, false);
        }
    });
}
