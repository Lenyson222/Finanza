<?php
// config.php
// Ponto único de configuração da aplicação.
// Lê credenciais do .env (nunca hardcoded) e define constantes globais.

define('ROOT_PATH', __DIR__);
define('APP_PATH',  __DIR__ . '/app');
define('VIEW_PATH', __DIR__ . '/view');
define('DB_PATH',   __DIR__ . '/database');

$envFile = ROOT_PATH . '/.env';

if (!file_exists($envFile)) {
    die('Erro crítico: arquivo .env não encontrado em ' . ROOT_PATH);
}

$env = parse_ini_file($envFile);

define('DB_DRIVER', $env['DB_DRIVER'] ?? 'sqlite');
define('DB_FILE',   $env['DB_PATH']   ?? 'finanza.sqlite');
define('DB_DSN',    DB_DRIVER . ':' . DB_PATH . '/' . DB_FILE);
