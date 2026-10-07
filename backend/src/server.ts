import cors from "cors";
import express from "express";

import { db } from "./prisma/db.js";
import { userRoutes } from "./routes/userRoutes.js";

const app = express();

// Permite requisições do frontend
app.use(cors());

// Permite receber JSON
app.use(express.json());

// Rota para verificar se a API está funcionando
app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "TypeBattle API funcionando!",
  });
});

// Rota para testar a conexão com o banco
app.get("/api/db-test", async (_request, response) => {
  try {
    // Consulta o model User através do Prisma 8
    await db.orm.public.User.all();

    response.json({
      status: "ok",
      message: "Conexão com PostgreSQL funcionando!",
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      status: "error",
      message: "Erro ao conectar com PostgreSQL.",
    });
  }
});

// Rotas de usuários
app.use("/api/users", userRoutes);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 TypeBattle API rodando em http://localhost:${PORT}`);
});
