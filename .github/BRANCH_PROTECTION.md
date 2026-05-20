# Branch Protection Rules — TheoSphere

## Branch `main`

| Regra                             | Configuração                            |
| :-------------------------------- | :-------------------------------------- |
| Require pull request reviews      | ✅ 2 aprovações necessárias             |
| Dismiss stale approvals           | ✅ Aprovações expiram com novos commits |
| Require review from Code Owners   | ✅                                      |
| Require status checks to pass     | ✅                                      |
| Required checks                   | `lint`, `test-backend`, `test-frontend` |
| Require branches to be up to date | ✅                                      |
| Require conversation resolution   | ✅                                      |
| Require signed commits            | ✅                                      |
| Restrict force pushes             | ✅                                      |

## Branch `develop`

| Regra                        | Configuração                 |
| :--------------------------- | :--------------------------- |
| Require pull request reviews | ✅ 1 aprovação               |
| Dismiss stale approvals      | ✅                           |
| Require status checks        | ✅ (mesmos checks do `main`) |

---

## Como Configurar (via UI do GitHub)

1. Acesse: `https://github.com/cristianotatianacolomboimoveis-prog/TheoSphere/settings/branches`
2. Clique em **Add branch protection rule** (ou edite a regra existente de `main`).
3. No campo **Branch name pattern**, insira `main`.
4. Marque as opções listadas na tabela acima.
5. Em **Require status checks to pass before merging**, adicione os checks:
   - `lint` (do workflow `Lint & Format Check`)
   - `test-backend` (do workflow `Test Suite`)
   - `test-frontend` (do workflow `Test Suite`)
6. Clique em **Create** ou **Save changes**.
7. Repita para o branch `develop`.

---

## Como Configurar (via GitHub CLI)

```bash
# Instale o GitHub CLI se necessário: https://cli.github.com/

# Proteção do branch main
gh api repos/cristianotatianacolomboimoveis-prog/TheoSphere/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint","test-backend","test-frontend"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":2}' \
  --field restrictions=null
```
