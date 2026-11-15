import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { UserTags } from "../../components/UserTags";
import { useAuth } from "../../contexts/useAuth";
import {
  deleteAdminTypingResult,
  getAdminUserInfo,
  getPublicProfile,
  type AdminUserInfo,
  type PublicProfile as PublicProfileData,
  type TypingResult,
} from "../../services/api";
import { BattleStats } from "../Profile/components/BattleStats";
import { MissedKeysCard } from "../Profile/components/MissedKeysCard";
import { ProfileOverview } from "../Profile/components/ProfileOverview";
import { ResultsHistory } from "../Profile/components/ResultsHistory";
import { panelSx } from "../Profile/styles";
import { AdminUserControls } from "./AdminUserControls";

const EMPTY_BATTLE = {
  summary: { played: 0, wins: 0, losses: 0, winRate: 0, bestPpm: 0, averagePpm: 0 },
  recent: [],
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatMemberSince(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: "0.75rem",
        fontWeight: 800,
        color,
        border: `1px solid ${color}66`,
        backgroundColor: `${color}1a`,
      }}
    >
      {label}
    </Box>
  );
}

// Perfil de qualquer jogador; o admin vê também o painel de controle.
// A key recria a página ao trocar de jogador (estado limpo, carregando).
export function PublicProfile() {
  const { userId } = useParams();
  return <PlayerProfile key={userId} rawId={userId} />;
}

function PlayerProfile({ rawId }: { rawId: string | undefined }) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const userId = Number(rawId);
  const validId = Number.isInteger(userId) && userId > 0;
  const isAdmin = Boolean(user?.isAdmin && token);

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [adminInfo, setAdminInfo] = useState<AdminUserInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!validId) return;
    let active = true;

    Promise.all([
      getPublicProfile(userId, token),
      isAdmin && token ? getAdminUserInfo(userId, token) : Promise.resolve(null),
    ])
      .then(([profileData, info]) => {
        if (!active) return;
        setProfile(profileData);
        setAdminInfo(info);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [userId, validId, token, isAdmin]);

  // O próprio perfil tem a página com foto e edição.
  if (validId && user?.id === userId) return <Navigate to="/profile" replace />;

  function patchProfile(changes: Partial<PublicProfileData>) {
    setProfile((current) => (current ? { ...current, ...changes } : current));
  }

  async function handleDeleteResult(result: TypingResult) {
    if (!token || !window.confirm(`Apagar o resultado de ${result.ppm} PPM?`)) return;
    try {
      await deleteAdminTypingResult(userId, result.id, token);
      patchProfile({
        results: profile?.results.filter((item) => item.id !== result.id) ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível apagar o resultado.");
    }
  }

  const results = profile?.results ?? [];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1180,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/ranking"))}
        sx={{ textTransform: "none", mb: 2, color: "text.secondary" }}
      >
        Voltar
      </Button>

      {!validId && <Alert severity="error">Jogador inválido.</Alert>}

      {validId && loading && !profile && (
        <Paper elevation={0} sx={{ ...panelSx, py: 6, textAlign: "center" }}>
          <CircularProgress color="secondary" />
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={profile ? () => setError("") : undefined}>
          {error}
        </Alert>
      )}

      {profile && (
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              ...panelSx,
              p: { xs: 2.5, sm: 3.5 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 2, sm: 3 },
            }}
          >
            <Avatar
              src={profile.user.avatarUrl ?? undefined}
              alt={`Foto de perfil de ${profile.user.name}`}
              sx={{
                width: { xs: 82, sm: 104 },
                height: { xs: 82, sm: 104 },
                fontSize: { xs: "1.6rem", sm: "2rem" },
                fontWeight: 800,
                color: "#f5f3ff",
                backgroundColor: "rgba(167,139,250,0.18)",
                border: "3px solid #a78bfa",
              }}
            >
              {getInitials(profile.user.name)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}
              >
                TYPEBATTLE / JOGADOR
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, letterSpacing: "-1px", overflowWrap: "anywhere" }}
                >
                  {profile.user.name}
                </Typography>
                <UserTags tags={profile.user.tags} size="medium" />
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Membro desde {formatMemberSince(profile.user.createdAt)}
                </Typography>
                {adminInfo?.banned && <StatusBadge label="BANIDO" color="#f87171" />}
                {adminInfo && !adminInfo.emailVerified && (
                  <StatusBadge label="EMAIL NÃO CONFIRMADO" color="#fbbf24" />
                )}
              </Box>
            </Box>
          </Paper>

          {adminInfo && token && (
            <AdminUserControls
              userId={userId}
              name={profile.user.name}
              tags={profile.user.tags}
              info={adminInfo}
              token={token}
              onRenamed={(name) => patchProfile({ user: { ...profile.user, name } })}
              onTagsChanged={(tags) => patchProfile({ user: { ...profile.user, tags } })}
              onBannedChanged={(banned) => setAdminInfo({ ...adminInfo, banned })}
              onResultsCleared={() => patchProfile({ results: [], battle: EMPTY_BATTLE })}
              onDeleted={() => navigate("/admin", { replace: true })}
            />
          )}

          {results.length > 0 ? (
            <>
              <ProfileOverview results={results} />
              <MissedKeysCard results={results} isOther />
            </>
          ) : (
            <Paper elevation={0} sx={{ ...panelSx, p: { xs: 3, sm: 4 }, textAlign: "center" }}>
              <Typography color="text.secondary">
                Este jogador ainda não fez nenhum teste.
              </Typography>
            </Paper>
          )}

          <BattleStats data={profile.battle} />

          {results.length > 0 && (
            <Box>
              <ResultsHistory
                results={results}
                onDelete={adminInfo ? handleDeleteResult : undefined}
              />
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}
