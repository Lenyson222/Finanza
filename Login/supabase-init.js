// supabase-init.js
// Inicializa o cliente Supabase e expõe como window.supabaseClient
// Incluir este script APÓS o CDN do Supabase (@supabase/supabase-js)

(function () {
    // ==========================================
    // CONFIGURAÇÃO DO SUPABASE
    // Preencha com os dados do seu projeto em https://supabase.com/dashboard
    // ==========================================
    const SUPABASE_URL = 'COLOQUE_SUA_SUPABASE_URL_AQUI';
    const SUPABASE_ANON_KEY = 'COLOQUE_SUA_ANON_KEY_AQUI';
    // ==========================================

    if (!window.supabaseClient) {
        try {
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[Finanza] Supabase client initialisado com sucesso.');
        } catch (e) {
            console.error('[Finanza] Erro ao inicializar Supabase:', e);
        }
    }
})();
