import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { adminRoutes } from "./routes/adminRoutes.js";
import { arcadeRoutes } from "./routes/arcadeRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { battleResultRoutes } from "./routes/battleResultRoutes.js";
import { cifraRoutes } from "./routes/cifraRoutes.js";
import { conjugaRoutes } from "./routes/conjugaRoutes.js";
import { embaralhaRoutes } from "./routes/embaralhaRoutes.js";
import { typingResultRoutes } from "./routes/typingResultRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { registerBattleSocket } from "./socket/battleSocket.js";
const app = express();
const httpServer = createServer(app);

// O Render fica atrás de um proxy; assim request.ip traz o IP real do cliente.
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
  // Se a conexão cair e voltar em até 20 s, o jogador recupera o mesmo id,
  // as salas e socket.data. O battleSocket espera esse tempo antes de removê-lo.
  connectionStateRecovery: {
    maxDisconnectionDuration: 20_000,
    skipMiddlewares: true,
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
app.use("/api/battle-results", battleResultRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arcade-results", arcadeRoutes);
app.use("/api/cifra", cifraRoutes);
app.use("/api/conjuga", conjugaRoutes);
app.use("/api/embaralha", embaralhaRoutes);

registerBattleSocket(io);

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`TypeBattle API rodando na porta ${PORT}`);
});
