<?php
// index.php
// Front Controller — Porta de Entrada da Aplicação.
// Responsabilidades: carregar config, ativar autoload e despachar o Router.
// Nada mais entra aqui.

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/autoload.php';

try {
    // 1. Instanciar o Banco de Dados (Singleton)
    $pdo = Database::getInstance();

    // 2. Montar as Dependências (Container de Injeção simples)
    $repository = new AlunoRepository($pdo);
    $service    = new MatriculaService($repository);
    $controller = new MatriculaController($service);

    // 3. Inicializa o Router passando o Controller já pronto
    $router = new Router($controller);
    $router->dispatch();

} catch (Exception $e) {
    // Erro fatal na inicialização — genérico, sem expor Stack Trace
    http_response_code(500);
    echo '<p style="color:red;font-family:sans-serif;">Erro fatal na inicialização: '
        . htmlspecialchars($e->getMessage()) . '</p>';
}