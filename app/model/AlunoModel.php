<?php
// app/model/AlunoModel.php
// O Model — representa apenas os DADOS do Aluno.
// Getters e Setters com encapsulamento correto. Sem lógica de banco.

class AlunoModel
{
    private string $nome;
    private int    $idade;
    private string $curso;

    // --- Getters ---

    public function getNome(): string { return $this->nome; }
    public function getIdade(): int   { return $this->idade; }
    public function getCurso(): string { return $this->curso; }

    // --- Setters ---

    public function setNome(string $nome): void   { $this->nome  = $nome; }
    public function setIdade(int $idade): void     { $this->idade = $idade; }
    public function setCurso(string $curso): void  { $this->curso = $curso; }
}
