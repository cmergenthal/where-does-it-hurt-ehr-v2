import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import OverviewTab from './tabs/OverviewTab';
import HealthHistoryTab from './tabs/HealthHistoryTab';
import MedicationsTab from './tabs/MedicationsTab';
import AllergiesTab from './tabs/AllergiesTab';
import PatientsList from './pages/PatientsList';
import BillingPage from './pages/BillingPage';
import LabResultsPage from './pages/LabResultsPage';
import DocumentsPage from './pages/DocumentsPage';
import ClinicalNoteDialog from './ClinicalNoteDialog';
import { formatDate, getAge, patients } from '../data/patients';
import { defaultLabPanels, labPanelsByPatient } from '../data/labs';
import { useWebex } from '../webex/WebexProvider';
import WebexCallPanel from '../webex/WebexCallPanel';
import { matchPatientToInteraction } from '../webex/patientMatcher';
import {
  classifyTranscriptTopic,
  EHR_TOPIC_LABELS,
  getConfidentLabTarget,
  shouldAutoNavigateTopic
} from '../webex/topicRouter';

const drawerWidth = 252;

const navigation = [
  { id: 'overview', label: 'Chart overview', icon: DashboardRoundedIcon, patientRequired: true },
  { id: 'patients', label: 'Patients', icon: PeopleAltRoundedIcon },
  { id: 'labs', label: 'Labs', icon: ScienceRoundedIcon, patientRequired: true },
  { id: 'appointments', label: 'Appointments', icon: CalendarMonthRoundedIcon, patientRequired: true },
  { id: 'documents', label: 'Documents', icon: DescriptionRoundedIcon, patientRequired: true },
  { id: 'billing', label: 'Billing', icon: ReceiptLongRoundedIcon }
];

const chartTabs = ['Overview', 'History', 'Medications', 'Allergies'];

export default function EHRApp() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState('overview');
  const [chartTab, setChartTab] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState(patients[0]);
  const [patientMenuAnchor, setPatientMenuAnchor] = useState(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [notesByPatient, setNotesByPatient] = useState({});
  const [webexNotice, setWebexNotice] = useState('');
  const [topicNavigationNotice, setTopicNavigationNotice] = useState(null);
  const [topicRouting, setTopicRouting] = useState({ status: 'idle', label: 'Waiting for conversation' });
  const [labNavigationTarget, setLabNavigationTarget] = useState(null);
  const pageRef = useRef(page);
  const topicRequestRef = useRef(null);
  const topicInteractionRef = useRef('');
  const lastManualNavigationAtRef = useRef(0);
  const lastManualLabSelectionAtRef = useRef(0);
  const lastAutomaticNavigationAtRef = useRef(0);
  const lastAutomaticLabNavigationAtRef = useRef(0);
  const {
    mode: webexMode,
    profile,
    agentState,
    activeTask,
    transcript,
    assistance,
    screenPop,
    notice: providerNotice,
    clearNotice,
    clearScreenPop,
    startOutdial,
    accept,
    decline,
    hold,
    resume,
    toggleMute,
    requestRealTimeAssistance,
    end,
    submitWrapup,
    changeAgentState,
    logout
  } = useWebex();

  const patientNotes = useMemo(
    () => notesByPatient[selectedPatient.id] || [],
    [notesByPatient, selectedPatient.id]
  );
  const topicTranscriptMessages = useMemo(
    () => (transcript?.messages || [])
      .filter((message) => message?.content)
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content })),
    [transcript?.messages]
  );
  const topicTranscriptKey = useMemo(
    () => topicTranscriptMessages.map((message) => `${message.role}:${message.content}`).join('|'),
    [topicTranscriptMessages]
  );
  const patientLabTargets = useMemo(
    () => (labPanelsByPatient[selectedPatient.id] || defaultLabPanels).map((panel) => ({
      id: panel.id,
      name: panel.panel,
      analytes: panel.results.map((result) => result.name)
    })),
    [selectedPatient.id]
  );

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    setLabNavigationTarget(null);
  }, [selectedPatient.id]);

  useEffect(() => {
    const interactionId = activeTask?.interactionId || '';
    if (topicInteractionRef.current === interactionId) return;

    topicRequestRef.current?.abort();
    topicRequestRef.current = null;
    topicInteractionRef.current = interactionId;
    lastAutomaticNavigationAtRef.current = 0;
    lastAutomaticLabNavigationAtRef.current = 0;
    lastManualLabSelectionAtRef.current = 0;
    setTopicNavigationNotice(null);
    setTopicRouting({ status: 'idle', label: 'Waiting for conversation' });
  }, [activeTask?.interactionId]);

  useEffect(() => {
    if (
      webexMode !== 'contact-center' ||
      !activeTask?.interactionId ||
      activeTask.offered ||
      activeTask.wrappingUp ||
      topicTranscriptMessages.length === 0 ||
      topicTranscriptKey.length < 24
    ) return undefined;

    setTopicRouting((current) => ({ ...current, status: 'waiting', error: '' }));

    const timeout = window.setTimeout(async () => {
      topicRequestRef.current?.abort();
      const controller = new AbortController();
      topicRequestRef.current = controller;
      setTopicRouting((current) => ({ ...current, status: 'analyzing', error: '' }));

      try {
        const currentPage = pageRef.current;
        const classification = await classifyTranscriptTopic({
          messages: topicTranscriptMessages,
          currentPage,
          labTargets: patientLabTargets,
          signal: controller.signal
        });
        const classifiedLabTarget = patientLabTargets.find(
          (target) => target.id === classification.labTargetId
        );
        setTopicRouting({
          status: 'classified',
          topic: classification.topic,
          label: EHR_TOPIC_LABELS[classification.topic] || 'No clear topic',
          confidence: Number(classification.confidence) || 0,
          labTargetLabel: classifiedLabTarget?.name || '',
          labConfidence: Number(classification.labConfidence) || 0,
          error: ''
        });
        const now = Date.now();
        const labTarget = getConfidentLabTarget({
          classification,
          labTargets: patientLabTargets,
          lastManualNavigationAt: lastManualLabSelectionAtRef.current,
          lastAutomaticNavigationAt: lastAutomaticLabNavigationAtRef.current,
          now
        });
        const shouldNavigatePage = shouldAutoNavigateTopic({
          classification,
          currentPage,
          lastManualNavigationAt: lastManualNavigationAtRef.current,
          lastAutomaticNavigationAt: lastAutomaticNavigationAtRef.current,
          now
        });

        if (labTarget) {
          lastAutomaticLabNavigationAtRef.current = now;
          setLabNavigationTarget({ panelId: labTarget.id, requestedAt: now });
        }

        if (!shouldNavigatePage && !labTarget) return;

        if (shouldNavigatePage) {
          lastAutomaticNavigationAtRef.current = now;
          setPage(classification.topic);
          setMobileOpen(false);
          if (classification.topic === 'overview') setChartTab(0);
        }
        setTopicNavigationNotice({
          message: labTarget
            ? `AI opened ${labTarget.name} in Labs based on the conversation.`
            : `AI opened ${EHR_TOPIC_LABELS[classification.topic]} based on the conversation.`,
          previousPage: currentPage
        });
      } catch (classificationError) {
        if (classificationError.name !== 'AbortError') {
          console.warn('[EHR topic router]', classificationError);
          setTopicRouting({
            status: 'error',
            label: 'Topic routing unavailable',
            error: classificationError.message || 'Topic classification failed.'
          });
        }
      }
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
      topicRequestRef.current?.abort();
    };
  }, [activeTask?.interactionId, activeTask?.offered, activeTask?.wrappingUp, patientLabTargets, topicTranscriptKey, topicTranscriptMessages, webexMode]);

  useEffect(() => {
    const interaction = screenPop || activeTask?.raw;
    if (!interaction) return;

    const { patient, identity } = matchPatientToInteraction(patients, interaction);
    if (patient) {
      setSelectedPatient(patient);
      setWebexNotice(`Webex matched this interaction to ${patient.name}.`);
    } else if (identity.phone || identity.patientId || identity.mrn) {
      setWebexNotice(`No patient match found for ${identity.phone || identity.patientId || identity.mrn}.`);
    }

    if (screenPop) clearScreenPop();
  }, [activeTask?.interactionId, activeTask?.raw, clearScreenPop, screenPop]);

  const navigate = (nextPage) => {
    lastManualNavigationAtRef.current = Date.now();
    setTopicNavigationNotice(null);
    setPage(nextPage);
    setMobileOpen(false);
  };

  const openPatientChart = (patient) => {
    lastManualNavigationAtRef.current = Date.now();
    setTopicNavigationNotice(null);
    setSelectedPatient(patient);
    setPage('overview');
    setChartTab(0);
    setPatientMenuAnchor(null);
  };

  const switchPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientMenuAnchor(null);
  };

  const handleSaveNote = (note, status) => {
    const today = new Date().toISOString().slice(0, 10);
    const activity = {
      date: today,
      type: note.type,
      detail: `${note.reason} — ${status === 'signed' ? 'signed' : 'saved as draft'} by Dr. Sarah Reynolds`,
      note: { ...note, status }
    };

    setNotesByPatient((current) => ({
      ...current,
      [selectedPatient.id]: [activity, ...(current[selectedPatient.id] || [])]
    }));
    setNoteDialogOpen(false);
    setNotice(
      status === 'signed'
        ? 'Clinical note signed and added to recent activity.'
        : 'Clinical note saved as a draft.'
    );
  };

  const agentDisplayStatus = agentState.subStatus || agentState.status || 'State unknown';
  const canToggleAgentState = ['Available', 'Idle'].includes(agentState.subStatus);
  const nextAgentState = agentState.subStatus === 'Available' ? 'Idle' : 'Available';
  const nextAgentAuxCode = agentState.subStatus === 'Available' ? profile?.idleCodes?.[0]?.id || '0' : '0';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0f2f3c', color: 'white' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 2.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 2,
            backgroundColor: 'primary.main',
            fontWeight: 850
          }}
        >
          W+
        </Box>
        <Box>
          <Typography fontWeight={800} lineHeight={1.1}>Where Does It Hurt</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.62)' }}>Clinical workspace</Typography>
        </Box>
      </Stack>

      <List sx={{ px: 1.25, py: 1 }}>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.id}
              selected={page === item.id}
              onClick={() => navigate(item.id)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: 'rgba(255,255,255,.76)',
                '& .MuiListItemIcon-root': { color: 'inherit' },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(41, 182, 168, .18)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(41, 182, 168, .24)' }
                },
                '&:hover': { backgroundColor: 'rgba(255,255,255,.07)', color: 'white' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 650, fontSize: 14 }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Paper sx={{ p: 1.5, color: 'white', backgroundColor: 'rgba(255,255,255,.07)' }} elevation={0}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 13 }}>SR</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>Dr. Sarah Reynolds</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.58)' }}>Internal Medicine</Typography>
            </Box>
          </Stack>
          <Button
            fullWidth
            size="small"
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
            sx={{ mt: 1.5, justifyContent: 'flex-start', color: 'rgba(255,255,255,.72)' }}
          >
            Log out station
          </Button>
        </Paper>
      </Box>
    </Box>
  );

  const showChartContext = !['patients', 'billing'].includes(page);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <Toolbar>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuRoundedIcon />
          </IconButton>
          <Button
            color="inherit"
            startIcon={<SearchRoundedIcon />}
            onClick={() => navigate('patients')}
            sx={{
              justifyContent: 'flex-start',
              color: 'text.secondary',
              backgroundColor: 'grey.50',
              px: 2,
              width: { xs: 'auto', sm: 320 }
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Search patients</Box>
          </Button>
          <Box sx={{ flex: 1 }} />
          <Tooltip
            title={
              canToggleAgentState
                ? `Click to set ${nextAgentState}`
                : 'Webex has not reported a toggleable agent state yet.'
            }
          >
            <span>
              <Chip
                size="small"
                label={`${agentState.teamName || 'Webex CC'} · ${agentDisplayStatus}`}
                color={agentState.subStatus === 'Available' ? 'success' : canToggleAgentState ? 'warning' : 'default'}
                variant="outlined"
                disabled={!canToggleAgentState}
                onClick={() => changeAgentState(nextAgentState, nextAgentAuxCode)}
                sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}
              />
            </span>
          </Tooltip>
          <Tooltip title="Notifications">
            <IconButton>
              <Badge color="error" variant="dot"><NotificationsNoneRoundedIcon /></Badge>
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1} alignItems="center" ml={1}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 13 }}>SR</Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={700}>Dr. Reynolds</Typography>
              <Typography variant="caption" color="text.secondary">Lakeshore Clinic</Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, border: 0 }
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Toolbar />

        {showChartContext && (
          <Box sx={{ backgroundColor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Container maxWidth="xl" sx={{ py: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar alt={selectedPatient.name} src={selectedPatient.photo} sx={{ width: 54, height: 54 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button
                      color="inherit"
                      onClick={(event) => setPatientMenuAnchor(event.currentTarget)}
                      endIcon={<KeyboardArrowDownRoundedIcon />}
                      sx={{ p: 0, fontSize: 20, fontWeight: 800, textTransform: 'none' }}
                    >
                      {selectedPatient.name}
                    </Button>
                    <Chip label={selectedPatient.id} size="small" variant="outlined" />
                    {selectedPatient.allergies.length > 0 && (
                      <Chip label={`${selectedPatient.allergies.length} allergies`} size="small" color="error" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {getAge(selectedPatient.dob)} years · {selectedPatient.pronouns} · DOB {formatDate(`${selectedPatient.dob}T00:00:00`)} · {selectedPatient.mrn}
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setNoteDialogOpen(true)}>
                  New note
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PhoneRoundedIcon />}
                  onClick={() => startOutdial(selectedPatient.phone)}
                >
                  Call patient
                </Button>
              </Stack>
            </Container>
            {page === 'overview' && (
              <Container maxWidth="xl">
                <Tabs
                  value={chartTab}
                  onChange={(_, value) => setChartTab(value)}
                  variant={desktop ? 'standard' : 'scrollable'}
                  scrollButtons="auto"
                >
                  {chartTabs.map((label) => <Tab key={label} label={label} />)}
                </Tabs>
              </Container>
            )}
          </Box>
        )}

        <Menu
          anchorEl={patientMenuAnchor}
          open={Boolean(patientMenuAnchor)}
          onClose={() => setPatientMenuAnchor(null)}
        >
          {patients.map((patient) => (
            <MenuItem key={patient.id} selected={patient.id === selectedPatient.id} onClick={() => switchPatient(patient)}>
              <Avatar src={patient.photo} sx={{ width: 28, height: 28, mr: 1.5 }} />
              {patient.name}
            </MenuItem>
          ))}
          <MenuItem onClick={() => navigate('patients')}>
            <SearchRoundedIcon fontSize="small" sx={{ mr: 1.5 }} /> Find another patient
          </MenuItem>
        </Menu>

        <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3.5 } }}>
          {page === 'patients' && <PatientsList patients={patients} onSelectPatient={openPatientChart} />}
          {page === 'labs' && (
            <LabResultsPage
              patient={selectedPatient}
              requestedPanel={labNavigationTarget}
              onManualPanelSelect={() => {
                lastManualLabSelectionAtRef.current = Date.now();
                setTopicNavigationNotice(null);
              }}
            />
          )}
          {page === 'appointments' && (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <iframe
                src={process.env.REACT_APP_CALENDAR_URL || '/calendarfrontend/'}
                title="Appointments"
                width="100%"
                height={760}
                style={{ border: 'none', display: 'block' }}
              />
            </Paper>
          )}
          {page === 'documents' && <DocumentsPage patient={selectedPatient} />}
          {page === 'billing' && <BillingPage />}
          {page === 'overview' && chartTab === 0 && (
            <OverviewTab
              patient={selectedPatient}
              notes={patientNotes}
              onCreateNote={() => setNoteDialogOpen(true)}
              onViewLabs={() => navigate('labs')}
            />
          )}
          {page === 'overview' && chartTab === 1 && <HealthHistoryTab patient={selectedPatient} />}
          {page === 'overview' && chartTab === 2 && <MedicationsTab patient={selectedPatient} />}
          {page === 'overview' && chartTab === 3 && <AllergiesTab patient={selectedPatient} />}
        </Container>
      </Box>

      <ClinicalNoteDialog
        open={noteDialogOpen}
        patient={selectedPatient}
        onClose={() => setNoteDialogOpen(false)}
        onSave={handleSaveNote}
      />
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice('')} message={notice} />
      <Snackbar
        open={Boolean(providerNotice)}
        autoHideDuration={4500}
        onClose={clearNotice}
        message={providerNotice}
      />
      <Snackbar
        open={Boolean(webexNotice)}
        autoHideDuration={4500}
        onClose={() => setWebexNotice('')}
        message={webexNotice}
      />
      <Snackbar
        open={Boolean(topicNavigationNotice)}
        autoHideDuration={7000}
        onClose={() => setTopicNavigationNotice(null)}
        message={topicNavigationNotice?.message || ''}
        action={(
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              if (topicNavigationNotice?.previousPage) {
                lastManualNavigationAtRef.current = Date.now();
                setPage(topicNavigationNotice.previousPage);
              }
              setTopicNavigationNotice(null);
            }}
          >
            Undo
          </Button>
        )}
      />
      <WebexCallPanel
        task={activeTask}
        patient={matchPatientToInteraction(patients, activeTask?.raw).patient}
        mode={webexMode}
        onAccept={accept}
        onDecline={decline}
        onHold={hold}
        onResume={resume}
        onToggleMute={toggleMute}
        onEnd={end}
        transcript={transcript}
        assistance={assistance}
        topicRouting={topicRouting}
        onRequestAssistance={requestRealTimeAssistance}
        wrapupCodes={profile?.wrapupCodes || []}
        onSubmitWrapup={submitWrapup}
      />
    </Box>
  );
}
