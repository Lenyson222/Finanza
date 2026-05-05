<?php
// migration.php
// Passo 1 (Refatorado): Criação do banco de dados
// Credenciais lidas do .env — nunca hardcoded no código.

$config = parse_ini_file(__DIR__ . '/.env');
$dsn    = $config['DB_DRIVER'] . ':' . __DIR__ . '/' . $config['DB_PATH'];

try {
    $pdo = new PDO($dsn);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "CREATE TABLE IF NOT EXISTS alunos (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        nome   TEXT    NOT NULL,
        idade  INTEGER NOT NULL,
        curso  TEXT    NOT NULL
    )";

    $pdo->exec($sql);
    echo "Migration executada com sucesso! Tabela 'alunos' pronta.\n";

} catch (PDOException $e) {
    // Em produção, não exibir detalhes técnicos
    echo "Erro na migration. Verifique as configurações do banco de dados.\n";
}