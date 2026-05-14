<?php
// Database.php
// Singleton de conexão PDO.
// Lê o DSN da constante DB_DSN definida em config.php — sem acesso direto ao .env aqui.

class Database
{
    private static ?PDO $instance = null;

    private function __construct() {}
    private function __clone() {}

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            // DB_DSN é definido em config.php como:
            //   sqlite:<ROOT_PATH>/database/finanza.sqlite
            if (!defined('DB_DSN')) {
                throw new \Exception('Constante DB_DSN não definida. Verifique config.php.');
            }

            self::$instance = new PDO(DB_DSN);
            self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }

        return self::$instance;
    }
}
