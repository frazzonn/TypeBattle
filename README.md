# TypeBattle

Teste de digitação em português com ranking e batalhas multiplayer em tempo real.

- **Frontend** (raiz do repositório): React 19, Vite, MUI, React Router, Socket.IO Client. Hospedado na Vercel.
- **Backend** (`backend/`): Express 5, Socket.IO, Prisma 8 (PostgreSQL), JWT, Cloudinary. Hospedado no Railway.

## Funcionalidades

- Teste de digitação de 15, 30 ou 60 segundos, com dificuldade, acentos, maiúsculas e pontuação configuráveis.
- Cadastro, login e perfil com histórico, gráfico de evolução e foto.
- Ranking público com o melhor resultado de cada jogador por duração.
- Batalhas de 2 a 4 jogadores (melhor de 1, 3 ou 5) sem precisar de conta. O servidor gera o texto e calcula a pontuação.

## Rodando localmente

Pré-requisitos: Node.js 20+ e um PostgreSQL.

### Backend

```bash
cd backend
npm install
```

Crie `backend/.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/typebattle
JWT_SECRET=uma-chave-longa-e-aleatoria
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
# Opcional: origens extras liberadas no CORS, separadas por vírgula
FRONTEND_URL=https://meu-front.vercel.app
```

Aplique as migrations e suba o servidor:

```bash
npx prisma db migrate
npm run dev        # http://localhost:3000
```

### Frontend

Na raiz:

```bash
npm install
npm run dev        # http://localhost:5173
```

Por padrão o front usa `http://localhost:3000`. Para apontar para outro backend, crie `.env.local`:

```env
VITE_API_URL=https://minha-api.up.railway.app/api
VITE_SOCKET_URL=https://minha-api.up.railway.app
```

## API

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/health` | | Status da API |
| POST | `/api/users` | | Cadastro |
| POST | `/api/auth/login` | | Login (retorna JWT de 7 dias) |
| GET | `/api/auth/me` | ✓ | Dados atuais do usuário |
| POST | `/api/users/avatar` | ✓ | Upload da foto (campo `avatar`, até 5 MB) |
| DELETE | `/api/users/avatar` | ✓ | Remove a foto |
| POST | `/api/typing-results` | ✓ | Salva um resultado |
| GET | `/api/typing-results` | ✓ | Histórico do usuário |
| GET | `/api/typing-results/ranking?duration=15\|30\|60` | | Top 100 da duração |

Login, cadastro, upload de foto e envio de resultados têm limite de requisições por IP.

## Estrutura do backend

```
backend/src/
  server.ts              Express, CORS, rotas e inicialização do Socket.IO
  routes/                Definição das rotas HTTP
  controllers/           Regras de cada rota
  middleware/            JWT e limite de requisições
  socket/battleSocket.ts Salas e partidas multiplayer
  battle/                Tipos e gerador de texto das partidas
  prisma/                Contrato do banco (contract.prisma) e cliente
```

## Deploy

- **Railway (backend):** root `backend/`, build `npm run build`, start `npm start`. Configure as variáveis do `.env` acima.
- **Vercel (frontend):** build `npm run build`, saída `dist/`. Configure `VITE_API_URL` e `VITE_SOCKET_URL`.
