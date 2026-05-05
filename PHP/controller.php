<?php
// controller.php
// Passo 4 (Refatorado): O Maestro (Controller)
// Recebe Service via construtor (Injeção de Dependência).
// Não usa "new" dentro das regras de negócio.
// Captura NegocioException e BancoDadosException separadamente.

require_once 'model.php';
require_once 'service.php';
require_once 'exceptions.php';

class MatriculaController
{
    // Depende da interface indiretamente via Service
    private MatriculaService $service;

    // Dependência injetada via construtor — sem "new" aqui
    public function __construct(MatriculaService $service)
    {
        $this->service = $service;
    }

    public function processarMatricula(array $dadosRequest): void
    {
        try {
            // 1. Aciona o Service para validar as regras de negócio
            $dadosValidados = $this->service->validarDados($dadosRequest);

            // 2. Monta o Model com os dados processados
            $aluno = new AlunoModel();
            $aluno->setNome($dadosValidados['nome']);
            $aluno->setIdade($dadosValidados['idade']);
            $aluno->setCurso($dadosValidados['curso']);

            // 3. Persiste via Service (que aciona o Repository)
            if ($this->service->salvar($aluno)) {
                $mensagemSucesso = "Matrícula realizada com sucesso! Bem-vindo(a), {$aluno->getNome()} — {$aluno->getCurso()}. {$dadosValidados['bolsa']}.";
                require 'view.php';
            } else {
                $mensagemErro = "Não foi possível concluir a matrícula. Tente novamente.";
                require 'view.php';
            }

        } catch (NegocioException $e) {
            // Falha de regra de negócio — mensagem direta e amigável
            $mensagemErro = $e->getMessage();
            require 'view.php';

        } catch (BancoDadosException $e) {
            // Falha técnica de banco — mensagem genérica, sem expor Stack Trace
            $mensagemErro = $e->getMessage();
            require 'view.php';
        }
    }
}