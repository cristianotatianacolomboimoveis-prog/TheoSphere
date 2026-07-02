# Guia de Configuração do Agente de Testes Diários

Este guia descreve como configurar, executar e agendar o script do agente de verificação diária (`scripts/daily_verifier_agent.py`).

## 1. Requisitos e Dependências

O script utiliza Python 3 (versão **3.10 ou superior**) e o SDK **Google Antigravity**.

### Instalação do Ambiente Virtual (via `uv`)

Se você tiver o `uv` instalado, pode configurar o ambiente virtual do Python 3.11 executando:

```bash
# Cria o ambiente virtual com Python 3.11
uv venv --python 3.11 .venv

# Instala a biblioteca google-antigravity e dependências necessárias
uv pip install google-antigravity --python .venv/bin/python3
```

Se preferir o `venv` tradicional do python (desde que seu `python3` padrão seja >= 3.10):

```bash
python3 -m venv .venv
.venv/bin/pip install google-antigravity
```

### Variáveis de Ambiente

O agente necessita de uma chave do Google Gemini para realizar a análise dos relatórios de erros.

1. Obtenha uma chave de API em: [Google AI Studio](https://aistudio.google.com/app/api-keys).
2. Adicione-a ao seu ambiente ou ao seu arquivo `.env` na raiz do projeto:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

---

## 2. Execução Manual

### Modo Verificação Única (Recomendado para CI/CD ou Cron)

Para rodar a suíte de testes uma vez, gerar a análise e encerrar:

```bash
python3 scripts/daily_verifier_agent.py --once
```

### Modo Daemon (Segundo Plano)

Para rodar o agente em loop contínuo que executa as verificações automaticamente a cada 24 horas:

```bash
python3 scripts/daily_verifier_agent.py --daemon
```

---

## 3. Agendamento Diário (macOS)

Recomendamos agendar a execução diária através do **cron** ou do **launchd** para que o script rode de forma transparente sem precisar de um terminal ativo em tempo integral.

### Opção A: Usando `cron` (Mais Simples)

1. Abra o editor do crontab:
   ```bash
   crontab -e
   ```
2. Adicione a seguinte linha para rodar o script todos os dias às 08:00 (ajuste os caminhos conforme o seu sistema):
   ```cron
   0 8 * * * export GEMINI_API_KEY="sua_chave_aqui" && /usr/bin/python3 /Users/cristianocolombo/Downloads/TheoSphere/scripts/daily_verifier_agent.py --once >> /Users/cristianocolombo/Downloads/TheoSphere/audit/reports/daily/cron.log 2>&1
   ```

### Opção B: Usando `launchd` (Nativo do macOS)

Você pode criar um arquivo Launch Agent em `~/Library/LaunchAgents/com.theosphere.dailyverifier.plist` com a configuração necessária para rodar diariamente em um horário específico.
