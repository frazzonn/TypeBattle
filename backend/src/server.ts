import cors from "cors";
import express from "express";

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

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 TypeBattle API rodando em http://localhost:${PORT}`);
});
