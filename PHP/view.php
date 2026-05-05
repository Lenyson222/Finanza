<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Sistema de Matrícula MVC</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            padding-top: 50px;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }

        h2 {
            text-align: center;
            color: #333;
        }

        .form-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            color: #666;
            font-weight: bold;
        }

        input,
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-sizing: border-box;
        }

        button {
            width: 100%;
            padding: 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: 0.3s;
        }

        button:hover {
            background-color: #45a049;
        }

        .alert-success {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid #c3e6cb;
        }

        .alert-error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>

<body>
    <div class="container">
        <h2>Nova Matrícula</h2>

        <?php if (!empty($mensagemSucesso)): ?>
            <div class="alert-success">
                <?= htmlspecialchars($mensagemSucesso) ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($mensagemErro)): ?>
            <div class="alert-error">
                <?= htmlspecialchars($mensagemErro) ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="/">
            <div class="form-group">
                <label for="nome">Nome Completo</label>
                <input type="text" id="nome" name="nome" placeholder="Digite seu nome">
            </div>

            <div class="form-group">
                <label for="idade">Idade</label>
                <input type="text" id="idade" name="idade" placeholder="Ex: 20">
            </div>

            <div class="form-group">
                <label for="curso">Curso de Interesse</label>
                <select id="curso" name="curso">
                    <option value="">Selecione...</option>
                    <option value="PHP">PHP Developer</option>
                    <option value="Javascript">Javascript Advanced</option>
                    <option value="Python">Python Data Science</option>
                    <option value="Banco de Dados">Banco de Dados e SQL</option>
                </select>
            </div>

            <button type="submit">Processar Matrícula</button>
        </form>
    </div>
</body>

</html>