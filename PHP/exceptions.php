<?php
// exceptions.php
// Exceções Customizadas — separadas por tipo de falha

/**
 * Lançada quando uma regra de negócio é violada.
 * Ex: nome muito curto, idade inválida, curso inexistente.
 */
class NegocioException extends Exception {}

/**
 * Lançada quando ocorre falha na persistência (PDO/SQL).
 * Ex: tabela não encontrada, falha na conexão.
 */
class BancoDadosException extends Exception {}
