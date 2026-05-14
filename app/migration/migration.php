<?php
// app/migration/migration.php
// Criação do banco de dados e tabelas.
// Run: php app/migration/migration.php (a partir de PHP/)
// Credenciais lidas via constante DB_DSN definida em config.php.

// Garante que config.php foi carregado (caso rodado diretamente via CLI)
if (!defined('DB_DSN')) {
    require_once __DIR__ . '/../../config.php';
}

try {
    $pdo = new PDO(DB_DSN);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "CREATE TABLE IF NOT EXISTS alunos (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        nome   TEXT    NOT NULL,
        idade  INTEGER NOT NULL,
        curso  TEXT    NOT NULL
    )";

    $pdo->exec($sql);
    echo "Migration executada com sucesso! Tabela 'alunos' pronta.\n";
    echo "Banco de dados em: " . DB_PATH . '/' . DB_FILE . "\n";

} catch (\PDOException $e) {
    // Em produção, não exibir detalhes técnicos
    echo "Erro na migration: " . $e->getMessage() . "\n";
}
