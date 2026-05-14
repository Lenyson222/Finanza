<?php
// app/middleware/Middleware.php
// Segurança: valida e sanitiza os dados antes de entregar ao Controller.

class Middleware
{
    /**
     * Valida os dados de entrada antes de entregar ao Controller.
     * Retorna string com a mensagem de erro, ou null se tudo OK.
     */
    public static function validar(array $dados): ?string
    {
        $nome  = isset($dados['nome'])  ? trim($dados['nome'])  : '';
        $idade = isset($dados['idade']) ? trim($dados['idade']) : '';
        $curso = isset($dados['curso']) ? trim($dados['curso']) : '';

        // Campos obrigatórios
        if (empty($nome) || empty($idade) || empty($curso)) {
            return 'Acesso Negado: Todos os campos são obrigatórios e devem ser preenchidos.';
        }

        // Proteção básica contra XSS
        if (str_contains($nome, '<script>') || str_contains($curso, '<script>')) {
            return 'Segurança: Tentativa de injeção de script (XSS) detectada e bloqueada.';
        }

        // Idade deve ser inteiro válido
        if (!filter_var($idade, FILTER_VALIDATE_INT)) {
            return 'Acesso Negado: O campo idade deve conter apenas números válidos.';
        }

        return null; // tudo OK
    }
}
