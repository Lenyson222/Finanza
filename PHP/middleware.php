<?php
// middleware.php
// Passo 5: Segurança (Middleware Avançado)

class Middleware
{
    /**
     * Valida os dados de entrada antes de entregar ao Controller.
     * Além de checar vazios, agora tem responsabilidade de barrar ataques (simples)
     * e garantir que as vars venham sanitizadas.
     */
    public static function validar($dados)
    {
        // Pega as variáveis diretas para checagem rápida de 'empty'
        $nome = isset($dados['nome']) ? trim($dados['nome']) : '';
        $idade = isset($dados['idade']) ? trim($dados['idade']) : '';
        $curso = isset($dados['curso']) ? trim($dados['curso']) : '';

        // Verifica se os campos estão preenchidos
        if (empty($nome) || empty($idade) || empty($curso)) {
            return "Acesso Negado: Todos os campos são obrigatórios e devem ser preenchidos.";
        }

        // Verifica ataque XSS rudimentar: Se a tag <script> existir, barra imediatamente.
        if (str_contains($nome, '<script>') || str_contains($curso, '<script>')) {
            return "Segurança: Tentativa de injeção de script (XSS) detectada e bloqueada.";
        }

        // Verifica se a idade é estritamente um número
        if (!filter_var($idade, FILTER_VALIDATE_INT)) {
            return "Acesso Negado: O campo idade deve conter apenas números válidos sem caracteres injetados.";
        }

        // Tudo OK, passa para o próximo nível
        return null;
    }
}