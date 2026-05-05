<?php
// middleware.php
// Passo 5: Segurança (Middleware)

class Middleware
{
    /**
     * Valida os dados de entrada antes de entregar ao Controller.
     * Retorna uma string de erro caso falhe, ou null caso seja válido.
     */
    public static function validar($dados)
    {
        // Verifica se os campos estão preenchidos
        if (empty(trim($dados['nome'])) || empty(trim($dados['idade'])) || empty(trim($dados['curso']))) {
            return "Acesso Negado: Todos os campos são obrigatórios e devem ser preenchidos.";
        }

        // Verifica se a idade é estritamente um número
        if (!is_numeric($dados['idade'])) {
            return "Acesso Negado: O campo idade deve conter apenas números válidos.";
        }

        // Tudo OK, passa para o próximo nível
        return null;
    }
}