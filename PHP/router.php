<?php
// router.php
// Passo 5 (Refatorado): Rotas
// Agora o Roteador recebe o Controller já instanciado (do index.php).
// Não há mais "new" aqui dentro, consolidando a inversão de controle.

require_once 'exceptions.php';
require_once 'middleware.php';

class Router
{
    private MatriculaController $controller;

    public function __construct(MatriculaController $controller)
    {
        $this->controller = $controller;
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            // Requisições GET exibem o formulário
            require 'view.php';

        } elseif ($method === 'POST') {

            // 1. Middleware intercepta e valida os campos (agora com proteção XSS)
            $erroValidacao = Middleware::validar($_POST);

            if ($erroValidacao) {
                $mensagemErro = $erroValidacao;
                require 'view.php';
                exit;
            }

            // 2. Aciona o Controller pronto com os dados seguros do formulário
            // Nota: O Middleware já aplicou filter_input, então $_POST aqui 
            // no mundo ideal poderia ser transferido para um Array DTO sanitizado, 
            // mas usaremos os originais filtrados logicamente pela própria superglobal ou via Service.
            // Para proteger XSS profundamente, o $_POST original vai ser lido sanitizado.
            
            // Re-lendo tudo usando o filtro POST da requisição (segurança de fato)
            $dadosSaneados = [
                'nome' => filter_input(INPUT_POST, 'nome', FILTER_SANITIZE_SPECIAL_CHARS),
                'idade' => filter_input(INPUT_POST, 'idade', FILTER_SANITIZE_NUMBER_INT),
                'curso' => filter_input(INPUT_POST, 'curso', FILTER_SANITIZE_SPECIAL_CHARS)
            ];

            $this->controller->processarMatricula($dadosSaneados);

        } else {
            echo "Método HTTP não suportado.";
        }
    }
}