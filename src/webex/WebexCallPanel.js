import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import PhoneDisabledRoundedIcon from '@mui/icons-material/PhoneDisabledRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PhoneInTalkRoundedIcon from '@mui/icons-material/PhoneInTalkRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';

const formatDuration = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function WebexCallPanel({
  task,
  patient,
  mode,
  onAccept,
  onDecline,
  onHold,
  onResume,
  onToggleMute,
  onEnd,
  transcript,
  assistance,
  topicRouting,
  onRequestAssistance,
  wrapupCodes = [],
  onSubmitWrapup
}) {
  const [expanded, setExpanded] = useState(true);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(false);
  const [wrapupCodeId, setWrapupCodeId] = useState('');
  const [submittingWrapup, setSubmittingWrapup] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [assistanceContext, setAssistanceContext] = useState('');
  const transcriptScrollRef = useRef(null);
  const interactionId = task?.interactionId;
  const transcriptMessages = transcript?.messages || [];
  const hasTranscriptContent =
    Boolean(transcript?.ivrTranscript || transcript?.ivrPath || transcriptMessages.length);
  const showTranscriptPanel = Boolean(transcript) && !task?.offered;
  const showAssistancePanel = Boolean(assistance && onRequestAssistance) && !task?.offered;
  const assistanceMessages = assistance?.messages || [];
  const assistanceBusy = assistance?.status === 'requesting' || assistance?.status === 'waiting';
  const latestTranscriptMessage = transcriptMessages[transcriptMessages.length - 1];
  const transcriptStatusLabel = (transcript?.status || 'listening').replace('-', ' ');
  const emptyTranscriptMessage =
    transcript?.status === 'not-enabled'
      ? 'Real-time transcript is not enabled for this Webex Contact Center tenant or agent profile.'
      : transcript?.status === 'history-empty'
        ? 'Webex did not return transcript history for this interaction.'
        : 'Listening for live transcript chunks from Webex AI Assistant…';

  useEffect(() => {
    setSeconds(0);
    setAssistanceContext('');
    if (!interactionId) return undefined;
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [interactionId]);

  useEffect(() => {
    const container = transcriptScrollRef.current;
    if (!container) return;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [latestTranscriptMessage?.content, latestTranscriptMessage?.id, transcript?.ivrTranscript]);

  if (!task) return null;

  const handleHold = async () => {
    if (held) {
      await onResume();
      setHeld(false);
    } else {
      await onHold();
      setHeld(true);
    }
  };

  const handleMute = async () => {
    await onToggleMute();
    setMuted((current) => !current);
  };

  const handleWrapup = async () => {
    const code = wrapupCodes.find((candidate) => candidate.id === wrapupCodeId);
    if (!code) return;

    setSubmittingWrapup(true);
    await onSubmitWrapup(code);
    setSubmittingWrapup(false);
  };

  return (
    <Card
      sx={{
        position: 'fixed',
        zIndex: 1300,
        right: 20,
        bottom: 20,
        width: { xs: 'calc(100% - 32px)', sm: 380 },
        maxHeight: 'calc(100vh - 32px)',
        boxShadow: '0 18px 50px rgba(15, 44, 68, .24)',
        '& .MuiTypography-root': { fontSize: '0.8rem' },
        '& .MuiTypography-caption': { fontSize: '0.68rem' },
        '& .MuiButton-root': { fontSize: '0.74rem', minHeight: 34 },
        '& .MuiInputBase-root': { fontSize: '0.78rem' },
        '& .MuiInputLabel-root': { fontSize: '0.78rem' },
        '& .MuiChip-label': { fontSize: '0.68rem' }
      }}
    >
      <CardContent sx={{ overflowY: 'auto', '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'success.light', color: 'success.dark' }}>
            <PhoneInTalkRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} sx={{ fontSize: '1rem !important' }} noWrap>{patient?.name || task.phone || 'Unknown caller'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {held ? 'On hold' : task.state}{!task.offered && ` · ${formatDuration(seconds)}`}
            </Typography>
          </Box>
          <Chip
            label={mode === 'standalone' ? 'Demo' : 'Webex CC'}
            size="small"
            color={mode === 'standalone' ? 'default' : 'primary'}
          />
          <IconButton size="small" onClick={() => setExpanded((current) => !current)}>
            {expanded ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowUpRoundedIcon />}
          </IconButton>
        </Stack>
        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Direction</Typography>
              <Typography variant="body2" fontWeight={650}>{task.direction}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Queue</Typography>
              <Typography variant="body2" fontWeight={650}>{task.queueName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Number</Typography>
              <Typography variant="body2" fontWeight={650}>{task.phone || 'Private'}</Typography>
            </Box>
          </Stack>
          <Stack spacing={2}>
            {task.wrappingUp ? (
              <Stack spacing={1.5}>
                <Typography fontWeight={700}>Select a wrap-up code</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="wrapup-code-label">Wrap-up code</InputLabel>
                  <Select
                    labelId="wrapup-code-label"
                    value={wrapupCodeId}
                    label="Wrap-up code"
                    onChange={(event) => setWrapupCodeId(event.target.value)}
                  >
                    {wrapupCodes.map((code) => (
                      <MenuItem key={code.id} value={code.id}>{code.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!wrapupCodeId || submittingWrapup}
                  onClick={handleWrapup}
                >
                  {submittingWrapup ? 'Submitting…' : 'Complete wrap-up'}
                </Button>
              </Stack>
            ) : task.offered ? (
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<CallRoundedIcon />}
                  onClick={onAccept}
                >
                  Answer
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<PhoneDisabledRoundedIcon />}
                  onClick={onDecline}
                >
                  Decline
                </Button>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  color={muted ? 'warning' : 'primary'}
                  startIcon={muted ? <MicOffRoundedIcon /> : <MicRoundedIcon />}
                  onClick={handleMute}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={held ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
                  onClick={handleHold}
                >
                  {held ? 'Resume' : 'Hold'}
                </Button>
                <Button fullWidth variant="contained" color="error" startIcon={<CallEndRoundedIcon />} onClick={onEnd}>
                  End
                </Button>
              </Stack>
            )}
            {showTranscriptPanel && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'grey.50' }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={800}>Transcript</Typography>
                    <Chip size="small" variant="outlined" label={transcriptStatusLabel} />
                  </Stack>
                  {topicRouting && (
                    <Stack spacing={0.25}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography variant="caption" color="text.secondary">Conversation topic</Typography>
                        <Chip
                          size="small"
                          color={topicRouting.status === 'error' ? 'error' : 'primary'}
                          variant="outlined"
                          label={
                            topicRouting.status === 'analyzing'
                              ? 'Analyzing…'
                              : topicRouting.status === 'waiting'
                                ? 'Waiting…'
                                : topicRouting.confidence
                                  ? `${topicRouting.label} · ${Math.round(topicRouting.confidence * 100)}%`
                                  : topicRouting.label
                          }
                        />
                      </Stack>
                      {topicRouting.error && (
                        <Typography variant="caption" color="error">{topicRouting.error}</Typography>
                      )}
                      {topicRouting.labTargetLabel && (
                        <Typography variant="caption" color="text.secondary">
                          Lab target: {topicRouting.labTargetLabel} · {Math.round(topicRouting.labConfidence * 100)}%
                        </Typography>
                      )}
                    </Stack>
                  )}
                  {!hasTranscriptContent && (
                    <Typography variant="caption" color="text.secondary">
                      {emptyTranscriptMessage}
                    </Typography>
                  )}
                  <Box
                    ref={transcriptScrollRef}
                    data-testid="live-transcript-scroll"
                    sx={{ maxHeight: 190, overflowY: 'auto', pr: 0.5, scrollbarGutter: 'stable' }}
                  >
                    <Stack spacing={0.75}>
                      {transcript?.ivrPath && (
                        <Typography variant="caption" color="text.secondary">
                          IVR path: {transcript.ivrPath}
                        </Typography>
                      )}
                      {transcript?.ivrTranscript && (
                        <Typography variant="body2">
                          <strong>IVR:</strong> {transcript.ivrTranscript}
                        </Typography>
                      )}
                      {transcriptMessages.map((message) => (
                        <Box key={message.id}>
                          <Typography variant="caption" color="text.secondary">
                            {message.role}
                          </Typography>
                          <Typography variant="body2">{message.content}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            )}
            {showAssistancePanel && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'action.hover' }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={800}>Real-time assistance</Typography>
                    <Chip size="small" variant="outlined" label={(assistance.status || 'idle').replace('-', ' ')} />
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeRoundedIcon />}
                    disabled={assistanceBusy || assistance?.status === 'not-enabled'}
                    onClick={() => onRequestAssistance('')}
                  >
                    {assistanceBusy ? 'Waiting for Webex…' : 'Get assistance'}
                  </Button>
                  {assistanceMessages.map((message, index) => (
                    <Typography key={`${message}-${index}`} variant="body2">{message}</Typography>
                  ))}
                  {assistance?.error && (
                    <Typography variant="caption" color="error">{assistance.error}</Typography>
                  )}
                  <TextField
                    size="small"
                    label="Add context"
                    value={assistanceContext}
                    onChange={(event) => setAssistanceContext(event.target.value)}
                    placeholder="Example: focus on scheduling options"
                  />
                  <Button
                    size="small"
                    disabled={!assistanceContext.trim() || assistanceBusy || assistance?.status === 'not-enabled'}
                    onClick={async () => {
                      await onRequestAssistance(assistanceContext);
                      setAssistanceContext('');
                    }}
                  >
                    Refine assistance
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}
