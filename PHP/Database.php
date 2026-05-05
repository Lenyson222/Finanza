<?php
// Database.php
// Passo 1: Configuração Base via Singleton.
// Retorna a instância única do PDO para evitar múltiplas conexões concorrentes.

class Database
{
    private static ?PDO $instance = null;

    // Construtor privado para impedir a criação com "new"
    private function __construct() {}

    // Clone privado para impedir a clonagem do objeto
    private function __clone() {}

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $configPath = __DIR__ . '/config.ini';
            
            if (!file_exists($configPath)) {
                throw new Exception("Arquivo de configuração não encontrado.");
            }

            $config = parse_ini_file($configPath);
            
            // Exemplo para SQLite (pode ser adaptado para mysql:host...)
            $dsn = $config['DB_DRIVER'] . ':' . __DIR__ . '/' . $config['DB_PATH'];
            
            self::$instance = new PDO($dsn);
            self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }

        return self::$instance;
    }
}
