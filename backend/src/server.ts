import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { authRoutes } from "./routes/authRoutes.js";
import { typingResultRoutes } from "./routes/typingResultRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { registerBattleSocket } from "./socket/battleSocket.js";
const app = express();
const httpServer = createServer(app);

// O Railway fica atrás de um proxy; assim request.ip traz o IP real do cliente.
app.set("trust proxy", 1);

// Mantém o acesso local e permite cadastrar a URL do frontend hospedado.
// Origens permitidas para acessar a API
const configuredOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://type-battle-wpqb.vercel.app",
  ...configuredOrigins,
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    // Permite requisições sem Origin e origens explicitamente autorizadas.
    // Para as demais, só omite os headers de CORS e o navegador bloqueia.
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// O CORS precisa vir antes das rotas da API
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});
// Rotas HTTP.
app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "TypeBattle API funcionando!",
  });
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/typing-results", typingResultRoutes);

registerBattleSocket(io);

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`TypeBattle API rodando na porta ${PORT}`);
});
