<?php
// app/router/Router.php
// Roteador: recebe o Controller já instanciado (do index.php).
// Sem "new" aqui — inversão de controle consolidada.

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
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if ($method === 'GET' && ($uri === '/' || $uri === '' || $uri === '/index.php')) {
            header('Location: /view/html/login.html');
            exit;
        }

        if ($method === 'GET') {
            // 1. Verificar se a URI aponta para um arquivo HTML existente em view/html
            // Remover '/view/html' da URI se ele já estiver lá (para evitar duplicação no path)
            $cleanUri = str_replace('/view/html', '', $uri);
            $filePath = VIEW_PATH . '/html/' . ltrim($cleanUri, '/');

            if (file_exists($filePath) && is_file($filePath)) {
                require $filePath;
                exit;
            }

            // 2. Se não encontrar o arquivo, mas for uma rota de "Dashboard", redirecionar para a plana
            if (strpos($uri, 'Inicio/Inicio.html') !== false) {
                header('Location: /view/html/Inicio.html');
                exit;
            }

            // Fallback: Requisições GET que não são arquivos estáticos exibem o formulário de matrícula
            require VIEW_PATH . '/matricula.php';

        } elseif ($method === 'POST') {

            // 1. Middleware intercepta e valida os campos (proteção XSS)
            $erroValidacao = Middleware::validar($_POST);

            if ($erroValidacao) {
                $mensagemErro = $erroValidacao;
                require VIEW_PATH . '/matricula.php';
                exit;
            }

            // 2. Sanitiza os dados antes de passar ao Controller
            $dadosSaneados = [
                'nome'  => filter_input(INPUT_POST, 'nome',  FILTER_SANITIZE_SPECIAL_CHARS),
                'idade' => filter_input(INPUT_POST, 'idade', FILTER_SANITIZE_NUMBER_INT),
                'curso' => filter_input(INPUT_POST, 'curso', FILTER_SANITIZE_SPECIAL_CHARS),
            ];

            // 3. Aciona o Controller pronto com dados seguros
            $this->controller->processarMatricula($dadosSaneados);

        } else {
            http_response_code(405);
            echo 'Método HTTP não suportado.';
        }
    }
}
