import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentPasteRoundedIcon from "@mui/icons-material/ContentPasteRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";

import { useAuth } from "../../contexts/useAuth";
import { ApiError, resendVerification, verifyEmail } from "../../services/api";

interface VerifyState {
  email?: string;
  password?: string;
  emailSent?: boolean;
}

const RESEND_SECONDS = 60;

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { startSession, isAuthenticated } = useAuth();

  // Vem do cadastro/login; a senha só fica em memória (nunca na URL).
  const state = (location.state ?? {}) as VerifyState;
  const email = state.email ?? searchParams.get("email") ?? "";

  // Pelo botão do email, o código já chega na URL.
  const [code, setCode] = useState(
    (searchParams.get("code") ?? "").replace(/\D/g, "").slice(0, 6),
  );
  const cameFromLink = code.length === 6;
  const [password, setPassword] = useState(state.password ?? "");
  const [error, setError] = useState(
    state.emailSent === false
      ? "Não conseguimos enviar o email agora. Tente reenviar o código."
      : "",
  );
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (isAuthenticated) return <Navigate to="/typing" replace />;
  if (!email) return <Navigate to="/register" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (code.length !== 6) {
      setError("Digite os 6 números do código.");
      return;
    }
    if (!password) {
      setError("Digite sua senha.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await verifyEmail({ email, code, password });
      startSession(response.token, response.user);
      navigate("/typing", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        setCode(digits);
        setError("");
      } else {
        setError("Não achamos um código de 6 números no que você copiou.");
      }
    } catch {
      setError("Não deu para colar automaticamente. Use Ctrl+V no campo.");
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");

    try {
      const response = await resendVerification(email);
      setInfo("Enviamos um código novo. Confira também a caixa de spam.");
      setCode("");
      setCooldown(response.retryAfter || RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) setCooldown(err.retryAfter);
      setError(err instanceof Error ? err.message : "Não foi possível reenviar.");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 430,
          p: { xs: 3, sm: 5 },
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack component="form" spacing={3} onSubmit={handleSubmit}>
          <Stack spacing={1} sx={{ textAlign: "center", alignItems: "center" }}>
            <MarkEmailReadRoundedIcon sx={{ fontSize: 44, color: "primary.main" }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Confirme seu email
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mandamos um código de 6 números para{" "}
              <Box component="strong" sx={{ color: "text.primary", overflowWrap: "anywhere" }}>
                {email}
              </Box>
              .
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}

          <TextField
            label="Código"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus={!cameFromLink}
            autoComplete="one-time-code"
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                maxLength: 6,
                style: {
                  textAlign: "center",
                  fontSize: "1.8rem",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                },
              },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Colar o código copiado">
                      <IconButton aria-label="Colar código" onClick={handlePaste} edge="end">
                        <ContentPasteRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Sem a senha em memória (página recarregada), pede de novo. */}
          {!state.password && (
            <TextField
              label="Senha da conta"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus={cameFromLink}
              helperText="A mesma que você usou no cadastro."
            />
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ py: 1.4, fontWeight: 700, textTransform: "none" }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : "Confirmar"}
          </Button>

          <Stack spacing={1} sx={{ textAlign: "center" }}>
            <Button
              variant="text"
              onClick={handleResend}
              disabled={cooldown > 0}
              sx={{ textTransform: "none" }}
            >
              {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
            </Button>
            <Typography variant="body2" color="text.secondary">
              Email errado?{" "}
              <Link to="/register" style={{ color: "#a78bfa" }}>
                Cadastrar de novo
              </Link>
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
