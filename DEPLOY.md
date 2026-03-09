# BetOps — Guia de Deploy

Stack: **React (Vercel) + FastAPI (Railway) + MongoDB (Railway)**

---

## 1. Deploy do Backend no Railway

### 1.1 Criar projeto no Railway
1. Acesse [railway.app](https://railway.app) e crie uma conta (ou faça login)
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório `BETOPS`
4. Quando perguntar qual pasta, selecione **`backend/`** (ou configure o root directory como `backend`)

### 1.2 Adicionar MongoDB
1. No projeto Railway, clique em **+ New → Database → MongoDB**
2. O Railway vai criar o banco e injetar a variável `MONGO_URL` automaticamente

### 1.3 Configurar variáveis de ambiente no Railway
Vá em **Variables** e adicione:

| Variável | Valor |
|----------|-------|
| `DB_NAME` | `betops` |
| `JWT_SECRET` | (gere com: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `JWT_ALGORITHM` | `HS256` |
| `CORS_ORIGINS` | `https://SEU-PROJETO.vercel.app` (preencha depois do deploy do frontend) |

> **Nota:** `MONGO_URL` é injetada automaticamente pelo plugin MongoDB do Railway.

### 1.4 Anotar a URL do backend
Após o deploy, o Railway vai te dar uma URL como:
`https://betops-backend-production.up.railway.app`

Guarde essa URL — você vai precisar dela para o frontend.

---

## 2. Deploy do Frontend na Vercel

### 2.1 Criar projeto na Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **New Project → Import Git Repository**
3. Selecione o repositório `BETOPS`
4. Em **Root Directory**, coloque: `frontend`
5. Em **Framework Preset**, selecione: `Create React App`

### 2.2 Configurar variável de ambiente na Vercel
Em **Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `REACT_APP_BACKEND_URL` | `https://SUA-URL.up.railway.app` (URL do Railway do passo 1.4) |

### 2.3 Deploy
Clique em **Deploy**. A Vercel vai buildar e publicar automaticamente.

### 2.4 Atualizar CORS no Railway
Depois que a Vercel te der a URL do frontend (ex: `https://betops.vercel.app`):
1. Volte no Railway → Variables
2. Atualize `CORS_ORIGINS` com a URL real da Vercel
3. O Railway vai fazer redeploy automaticamente

---

## 3. Verificar que está funcionando

- Acesse `https://SUA-URL.up.railway.app/api/health` — deve retornar `{"status": "ok"}`
- Acesse o frontend na Vercel → tela de login deve aparecer
- Crie uma conta e faça login

---

## 4. Deploys futuros (automático)

Tanto Vercel quanto Railway fazem **deploy automático** a cada `git push` na branch `main`. Basta subir as mudanças e o sistema atualiza sozinho.

---

## Estrutura do projeto

```
BETOPS/
├── frontend/          ← Deploy na Vercel
│   ├── vercel.json    ← Corrige o 404 do SPA
│   ├── .env.example   ← Variáveis necessárias
│   └── src/
├── backend/           ← Deploy no Railway
│   ├── railway.toml   ← Configuração do Railway
│   ├── Procfile       ← Comando de start
│   ├── .env.example   ← Variáveis necessárias
│   └── server.py
└── DEPLOY.md          ← Este arquivo
```
