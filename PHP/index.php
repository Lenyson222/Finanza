<?php
// index.php
// Passo 5: A Porta de Entrada (Front Controller) e Container de Injeção de Dependências Simplificado.

require_once 'Database.php';
require_once 'AlunoRepositoryInterface.php';
require_once 'AlunoRepository.php';
require_once 'model.php';
require_once 'service.php';
require_once 'controller.php';
require_once 'router.php';

try {
    // 1. Instanciar o Banco de Dados (Singleton)
    $pdo = Database::getInstance();

    // 2. Montar as Dependências
    $repository = new AlunoRepository($pdo);
    $service    = new MatriculaService($repository);
    $controller = new MatriculaController($service);

    // 3. Inicializa o Router passando o Controller pronto
    $router = new Router($controller);
    $router->dispatch();

} catch (Exception $e) {
    // Tratamento genérico caso o contêiner falhe ao montar
    echo "Erro fatal na inicialização da aplicação: " . htmlspecialchars($e->getMessage());
}