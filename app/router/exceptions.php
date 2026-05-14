<?php
// app/router/exceptions.php
// Exceções customizadas — separadas por tipo de falha.
// Carregadas pelo autoload via router/ (ou incluídas diretamente).

/**
 * Lançada quando uma regra de negócio é violada.
 * Ex: nome curto, idade inválida, curso inexistente.
 */
class NegocioException extends Exception {}

/**
 * Lançada quando ocorre falha na persistência (PDO/SQL).
 * Ex: tabela não encontrada, falha na conexão.
 */
class BancoDadosException extends Exception {}
