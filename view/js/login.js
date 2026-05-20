// login.js — Lógica completa da tela de login

const DASHBOARD_URL = 'Inicio.html';

// ─── Mostrar toast de sucesso do cadastro ───────────────────────────────────
const params = new URLSearchParams(window.location.search);
if (params.get('cadastro') === 'ok') {
    const toast = document.getElementById('toast-cadastro');
    if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 6000);
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function mostrarErro(msg) {
    const el = document.getElementById('msg-erro-login');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function ocultarErro() {
    const el = document.getElementById('msg-erro-login');
    if (el) el.classList.add('hidden');
}

function setCarregando(btn, carregando, textoOriginal) {
    if (!btn) return;
    btn.disabled = carregando;
    btn.style.opacity = carregando ? '0.7' : '1';
    btn.style.cursor = carregando ? 'wait' : 'pointer';
    if (carregando) btn.textContent = '⏳ Aguarde...';
    else btn.textContent = textoOriginal;
}

function redirecionarDashboard() {
    window.location.href = DASHBOARD_URL;
}

// ─── Toggle visibilidade da senha ───────────────────────────────────────────
const btnOlho = document.getElementById('btn-toggle-senha');
const inputSenha = document.getElementById('login-senha');

if (btnOlho && inputSenha) {
    btnOlho.addEventListener('click', () => {
        const visible = inputSenha.type === 'text';
        inputSenha.type = visible ? 'password' : 'text';
        btnOlho.textContent = visible ? '👁' : '🙈';
    });
}

// ─── Formulário email + senha ────────────────────────────────────────────────
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', async function (e) {
        e.preventDefault();
        ocultarErro();

        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-senha').value;
        const btn = document.getElementById('btn-login-email');

        if (!email || !senha) {
            mostrarErro('Por favor, preencha o e-mail e a senha.');
            return;
        }

        setCarregando(btn, true, 'Entrar na minha conta');

        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password: senha
            });

            if (error) {
                // Mensagens amigáveis para erros comuns
                if (error.message.includes('Invalid login credentials')) {
                    mostrarErro('E-mail ou senha incorretos. Verifique e tente novamente.');
                } else if (error.message.includes('Email not confirmed')) {
                    mostrarErro('Confirme seu e-mail antes de entrar. Verifique a sua caixa de entrada.');
                } else {
                    mostrarErro('Falha ao entrar: ' + error.message);
                }
                setCarregando(btn, false, 'Entrar na minha conta');
                return;
            }

            // Salva sessão local e redireciona
            const user = data.user;
            localStorage.setItem('SessaoFinanza', JSON.stringify({
                tipo: 'email',
                uid: user.id,
                nome: user.user_metadata?.full_name || user.email.split('@')[0],
                foto: user.user_metadata?.avatar_url || '',
                email: user.email
            }));

            redirecionarDashboard();

        } catch (err) {
            console.error('Erro no login:', err);
            mostrarErro('Ocorreu um erro inesperado. Tente novamente.');
            setCarregando(btn, false, 'Entrar na minha conta');
        }
    });
}

// ─── Botão Google ────────────────────────────────────────────────────────────
const botaoGoogle = document.getElementById('btn-google');
if (botaoGoogle) {
    botaoGoogle.addEventListener('click', async function (e) {
        e.preventDefault();
        setCarregando(botaoGoogle, true, 'Entrar com Google');

        const { error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin +
                    window.location.pathname.replace('login.html', 'Inicio.html')
            }
        });

        if (error) {
            console.error('Erro no login Google:', error);
            mostrarErro('Falha ao entrar com Google: ' + error.message);
            setCarregando(botaoGoogle, true, 'Entrar com Google');
        }
        // O Supabase fará o redirecionamento automaticamente
    });
}

// ─── Botão Convidado ─────────────────────────────────────────────────────────
const botaoConvidado = document.getElementById('btn-guest');
if (botaoConvidado) {
    botaoConvidado.addEventListener('click', function (e) {
        e.preventDefault();
        setCarregando(botaoConvidado, true);
        botaoConvidado.textContent = '⏳ A iniciar painel...';

        localStorage.setItem('SessaoFinanza', JSON.stringify({
            tipo: 'convidado',
            nome: 'Convidado',
            foto: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            email: 'Acesso Local'
        }));

        setTimeout(() => { window.location.href = DASHBOARD_URL; }, 1200);
    });
}
