<?php
// app/services/MatriculaService.php
// Regras de Negócio (Service).
// O Service recebe o repositório via construtor (Injeção de Dependência).
// Lança NegocioException em falhas de regra — nunca Exception genérica.

class MatriculaService
{
    // Depende da Interface, não da implementação concreta
    private AlunoRepositoryInterface $repository;

    public function __construct(AlunoRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Valida os dados de entrada segundo as regras de negócio.
     * Lança NegocioException em caso de violação.
     * Retorna array com dados processados + info de bolsa.
     */
    public function validarDados(array $dados): array
    {
        $nome  = trim($dados['nome']);
        $idade = (int) $dados['idade'];
        $curso = trim($dados['curso']);

        // Regra 1: Tamanho mínimo do nome
        if (strlen($nome) < 3) {
            throw new NegocioException('O nome deve conter pelo menos 3 caracteres.');
        }

        // Regra 2: Idade mínima
        if ($idade < 18) {
            throw new NegocioException('Matrícula recusada: o aluno deve ser maior de idade (18+).');
        }

        // Regra 3: Cursos válidos
        $cursosValidos = ['PHP', 'JAVASCRIPT', 'PYTHON', 'BANCO DE DADOS'];
        if (!in_array(strtoupper($curso), $cursosValidos)) {
            throw new NegocioException('Curso inválido. Escolha: PHP, Javascript, Python ou Banco de Dados.');
        }

        // Regra 4: Bolsa de Estudos (simulação)
        $bolsa = ($idade >= 60) ? 'Bolsa Melhor Idade Aprovada' : 'Sem bolsa aplicada';

        return [
            'nome'  => $nome,
            'idade' => $idade,
            'curso' => strtoupper($curso),
            'bolsa' => $bolsa,
        ];
    }

    /**
     * Aciona o Repository para persistir o aluno.
     * Repassa BancoDadosException se o Repository falhar.
     */
    public function salvar(AlunoModel $aluno): bool
    {
        return $this->repository->salvar($aluno);
    }
}
