<?php
// index.php
// Passo 5: A Porta de Entrada (Front Controller)

// Este é o ponto único de entrada da aplicação.
// O navegador sempre chama o index.php, que inicializa o Router.

require_once 'router.php';

$router = new Router();
$router->dispatch();