import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";

import { useAuth } from "../../contexts/useAuth";
import { ApiError, forgotPassword, resetPassword } from "../../services/api";

const RESEND_SECONDS = 60;

// Duas etapas: 1) informa o email e recebe o código; 2) código + senha nova.
// Pelo botão do email, já abre na etapa 2 com tudo preenchido.
export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startSession, isAuthenticated } = useAuth();

  const linkCode = (searchParams.get("code") ?? "").replace(/\D/g, "").slice(0, 6);
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [step, setStep] = useState<"email" | "code">(
    email && linkCode.length === 6 ? "code" : "email",
  );
  const [code, setCode] = useState(linkCode);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (isAuthenticated) return <Navigate to="/typing" replace />;

  async function requestCode() {
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Informe o email da sua conta.");
      return false;
    }

    try {
      setIsLoading(true);
      const response = await forgotPassword(email.trim());
      setCooldown(response.retryAfter || RESEND_SECONDS);
      setInfo("Se existir uma conta com esse email, o código já está a caminho. Confira também o spam.");
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) {
        setCooldown(err.retryAfter);
        // Já tem um código recente: deixa usar ele.
        return true;
      }
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (await requestCode()) {
      setCode("");
      setStep("code");
    }
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (code.length !== 6) {
      setError("Digite os 6 números do código.");
      return;
    }
    if (password.length < 6) {
      setError("A senha nova precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await resetPassword({ email: email.trim(), code, password });
      startSession(response.token, response.user);
      navigate("/typing", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setIsLoading(false);
    }
  }

  const passwordToggle = {
    input: {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            onClick={() => setShowPassword((previous) => !previous)}
            edge="end"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      ),
    },
  };

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
        <Stack spacing={3}>
          <Stack spacing={1} sx={{ textAlign: "center", alignItems: "center" }}>
            <LockResetRoundedIcon sx={{ fontSize: 44, color: "primary.main" }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {step === "email" ? "Esqueceu a senha?" : "Crie uma senha nova"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {step === "email" ? (
                "Informe o email da conta e mandamos um código para você criar uma senha nova."
              ) : (
                <>
                  Digite o código que mandamos para{" "}
                  <Box component="strong" sx={{ color: "text.primary", overflowWrap: "anywhere" }}>
                    {email.trim()}
                  </Box>{" "}
                  e escolha a senha nova.
                </>
              )}
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}

          {step === "email" ? (
            <Stack component="form" spacing={2.5} onSubmit={handleEmailSubmit}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ minHeight: 48 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : "Enviar código"}
              </Button>
            </Stack>
          ) : (
            <Stack component="form" spacing={2.5} onSubmit={handleResetSubmit}>
              <TextField
                label="Código"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus={!linkCode}
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
                }}
              />
              <TextField
                label="Senha nova"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus={Boolean(linkCode)}
                helperText="Entre 6 e 72 caracteres."
                slotProps={passwordToggle}
                fullWidth
              />
              <TextField
                label="Repita a senha nova"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ minHeight: 48 }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : "Trocar senha e entrar"}
              </Button>

              <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                <Button
                  variant="text"
                  onClick={requestCode}
                  disabled={cooldown > 0 || isLoading}
                  sx={{ textTransform: "none" }}
                >
                  {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
                </Button>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setInfo("");
                  }}
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  Usar outro email
                </Button>
              </Stack>
            </Stack>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Lembrou a senha?{" "}
            <Link to="/login" style={{ color: "#a78bfa", fontWeight: 600 }}>
              Voltar para o login
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
