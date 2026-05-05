<?php
// router.php
// Passo 5 (Refatorado): Rotas + Composição das Dependências
//
// Este é o único lugar do sistema onde "new" é usado para montar as dependências.
// Fluxo: .env → PDO → Repository → Service → Controller
// O Router é o responsável pela Injeção de Dependência (manual DI Container).

require_once 'exceptions.php';
require_once 'AlunoRepositoryInterface.php';
require_once 'AlunoRepository.php';
require_once 'model.php';
require_once 'service.php';
require_once 'controller.php';
require_once 'middleware.php';

class Router
{
    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            // Requisições GET exibem o formulário
            require 'view.php';

        } elseif ($method === 'POST') {

            // 1. Middleware intercepta e valida os campos obrigatórios
            $erroValidacao = Middleware::validar($_POST);

            if ($erroValidacao) {
                $mensagemErro = $erroValidacao;
                require 'view.php';
                exit;
            }

            // 2. Composição das dependências (único local com "new" no sistema)
            //    Lê configurações do .env para não expor credenciais no código
            $config = parse_ini_file(__DIR__ . '/.env');
            $dsn    = $config['DB_DRIVER'] . ':' . __DIR__ . '/' . $config['DB_PATH'];

            try {
                $pdo = new PDO($dsn);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $e) {
                $mensagemErro = "Falha na conexão com o banco de dados. Contate o suporte.";
                require 'view.php';
                exit;
            }

            // 3. Injeção de Dependência: PDO → Repository → Service → Controller
            $repository = new AlunoRepository($pdo);
            $service    = new MatriculaService($repository);
            $controller = new MatriculaController($service);

            // 4. Aciona o Controller com os dados do formulário
            $controller->processarMatricula($_POST);

        } else {
            echo "Método HTTP não suportado.";
        }
    }
}