<?php
// autoload.php
// Registra o carregador automático de classes PSR-like sem namespace.
// Mapeia o nome da classe para o arquivo correto dentro de app/.

spl_autoload_register(function (string $className): void {

    // Mapa de classes para seus diretórios dentro de app/
    $directories = [
        __DIR__ . '/app/controller/',
        __DIR__ . '/app/model/',
        __DIR__ . '/app/middleware/',
        __DIR__ . '/app/services/',
        __DIR__ . '/app/router/',
        __DIR__ . '/app/migration/',
    ];

    foreach ($directories as $dir) {
        $file = $dir . $className . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});
