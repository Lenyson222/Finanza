<?php
// app/services/AlunoRepositoryInterface.php
// Contrato (Interface) que define o que qualquer repositório de Aluno deve implementar.
// Controllers e Services conversam APENAS com esta Interface.

interface AlunoRepositoryInterface
{
    public function salvar(AlunoModel $aluno): bool;
}
