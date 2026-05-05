<?php
// AlunoRepository.php
// Passo 2 (Refatorado): Repositório — única camada que conhece PDO/SQL.
// Implementa o contrato definido pela Interface.

require_once 'AlunoRepositoryInterface.php';
require_once 'exceptions.php';

class AlunoRepository implements AlunoRepositoryInterface
{
    // A conexão PDO é INJETADA via construtor — o Repository não cria a conexão
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Persiste um AlunoModel no banco de dados.
     * Lança BancoDadosException em caso de falha — sem expor Stack Trace.
     */
    public function salvar(AlunoModel $aluno): bool
    {
        try {
            $stmt = $this->pdo->prepare(
                "INSERT INTO alunos (nome, idade, curso) VALUES (:nome, :idade, :curso)"
            );

            $stmt->bindValue(':nome',  $aluno->getNome());
            $stmt->bindValue(':idade', $aluno->getIdade());
            $stmt->bindValue(':curso', $aluno->getCurso());

            return $stmt->execute();

        } catch (PDOException $e) {
            // Captura falha técnica e lança exceção amigável — Stack Trace não chega à View
            throw new BancoDadosException("Falha ao salvar os dados. Tente novamente mais tarde.");
        }
    }
}
