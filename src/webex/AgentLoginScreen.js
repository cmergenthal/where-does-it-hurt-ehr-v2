import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded';

export default function AgentLoginScreen({
  stage,
  configured,
  profile,
  error,
  authDiagnostics,
  teamId,
  loginOption,
  dialNumber,
  onTeamChange,
  onLoginOptionChange,
  onDialNumberChange,
  onWebexLogin,
  onResetLogin,
  onStationLogin,
  onClearExistingSession,
  onRecoverExistingSession,
  duplicateSession,
  onRetry
}) {
  const loading = ['initializing', 'registering', 'station-login'].includes(stage);
  const needsDialNumber = loginOption === 'AGENT_DN' || loginOption === 'EXTENSION';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: 'radial-gradient(circle at top left, #d7f3ef, transparent 36%), #f4f7f8'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 520, boxShadow: '0 24px 70px rgba(15, 44, 68, .14)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
                <MedicalServicesRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={850}>Where Does It Hurt</Typography>
                <Typography color="text.secondary">Webex Contact Center agent login</Typography>
              </Box>
            </Stack>

            {!configured && stage !== 'initializing' && (
              <Alert severity="warning">
                Webex OAuth is not configured. Set <code>REACT_APP_WEBEX_CLIENT_ID</code> and
                <code> REACT_APP_WEBEX_REDIRECT_URI</code>.
              </Alert>
            )}

            {error && (
              <Alert
                severity="error"
                action={
                  duplicateSession ? (
                    <Stack direction="row" spacing={1}>
                      <Button color="inherit" size="small" onClick={onRecoverExistingSession}>
                        Recover task
                      </Button>
                      <Button color="inherit" size="small" onClick={onClearExistingSession}>
                        Clear session
                      </Button>
                    </Stack>
                  ) : null
                }
              >
                {duplicateSession
                  ? 'This agent is already logged into another station or browser session.'
                  : error}
              </Alert>
            )}

            {duplicateSession && (
              <Typography variant="body2" color="text.secondary">
                If you refreshed during wrap-up, use Recover task to reopen the EHR and
                complete the pending wrap-up. Use Clear session only when you want to force
                the old station session out.
              </Typography>
            )}

            {stage === 'initializing' && (
              <Stack alignItems="center" spacing={2} py={3}>
                <CircularProgress />
                <Typography color="text.secondary">Initializing Webex Contact Center…</Typography>
              </Stack>
            )}

            {stage === 'unauthenticated' && configured && (
              <>
                <Typography>
                  Sign in with the Webex account licensed and configured as a Contact Center agent.
                </Typography>
                <Stack spacing={1}>
                  <Button variant="contained" size="large" startIcon={<LoginRoundedIcon />} onClick={onWebexLogin}>
                    Sign in with Webex
                  </Button>
                  <Button variant="text" onClick={onResetLogin}>
                    Reset Webex login
                  </Button>
                </Stack>
                {authDiagnostics && (
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight={700}>OAuth callback diagnostics</Typography>
                    <Typography variant="caption" component="div">
                      Redirect URI: {authDiagnostics.redirectUri}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Current page: {authDiagnostics.currentPath}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Query keys: {authDiagnostics.queryKeys.length ? authDiagnostics.queryKeys.join(', ') : 'none'}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Hash keys: {authDiagnostics.hashKeys.length ? authDiagnostics.hashKeys.join(', ') : 'none'}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Pre-SDK query keys: {authDiagnostics.preInitQueryKeys?.length ? authDiagnostics.preInitQueryKeys.join(', ') : 'none'}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Pre-SDK hash keys: {authDiagnostics.preInitHashKeys?.length ? authDiagnostics.preInitHashKeys.join(', ') : 'none'}
                    </Typography>
                    <Typography variant="caption" component="div">
                      Token before SDK cleanup: {authDiagnostics.hadAccessTokenBeforeSdk ? 'yes' : 'no'}
                    </Typography>
                    {authDiagnostics.tokenType && (
                      <Typography variant="caption" component="div">
                        Token type: {authDiagnostics.tokenType}
                      </Typography>
                    )}
                    {authDiagnostics.tokenScope && (
                      <Typography variant="caption" component="div">
                        Token scopes: {authDiagnostics.tokenScope}
                      </Typography>
                    )}
                    {authDiagnostics.authorizeRequest && (
                      <>
                        <Typography variant="caption" component="div">
                          Requested response type: {authDiagnostics.authorizeRequest.responseType || 'unknown'}
                        </Typography>
                        <Typography variant="caption" component="div">
                          Requested redirect: {authDiagnostics.authorizeRequest.redirectUri || 'unknown'}
                        </Typography>
                        <Typography variant="caption" component="div">
                          Requested scopes: {authDiagnostics.authorizeRequest.scopes?.join(', ') || 'none'}
                        </Typography>
                      </>
                    )}
                  </Alert>
                )}
              </>
            )}

            {stage === 'station-setup' && profile && (
              <>
                <Box>
                  <Typography variant="h6" fontWeight={750}>Choose your agent station</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select the team and calling device for this session.
                  </Typography>
                </Box>
                <FormControl fullWidth>
                  <InputLabel>Team</InputLabel>
                  <Select value={teamId} label="Team" onChange={(event) => onTeamChange(event.target.value)}>
                    {(profile.teams || []).map((team) => (
                      <MenuItem key={team.teamId || team.id} value={team.teamId || team.id}>
                        {team.teamName || team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Calling device</InputLabel>
                  <Select value={loginOption} label="Calling device" onChange={(event) => onLoginOptionChange(event.target.value)}>
                    {(profile.loginVoiceOptions || [])
                      .filter((option) => option !== 'BROWSER' || profile.webRtcEnabled)
                      .map((option) => (
                        <MenuItem key={option} value={option}>
                          {option === 'BROWSER' ? 'Browser audio' : option === 'EXTENSION' ? 'Extension' : 'Agent dial number'}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                {needsDialNumber && (
                  <TextField
                    label={loginOption === 'EXTENSION' ? 'Extension' : 'Dial number'}
                    value={dialNumber}
                    onChange={(event) => onDialNumberChange(event.target.value)}
                  />
                )}
                <Button
                  variant="contained"
                  size="large"
                  disabled={!teamId || !loginOption || (needsDialNumber && !dialNumber)}
                  onClick={onStationLogin}
                >
                  Start agent session
                </Button>
              </>
            )}

            {loading && stage !== 'initializing' && (
              <Stack alignItems="center" spacing={2} py={3}>
                <CircularProgress />
                <Typography color="text.secondary">
                  {stage === 'registering' ? 'Loading agent profile…' : 'Connecting agent station…'}
                </Typography>
              </Stack>
            )}

            {stage === 'error' && (
              <Button variant="contained" onClick={onRetry}>Try again</Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
