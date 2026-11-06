import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import { formatDate } from '../../data/patients';

const vitalLabels = [
  ['bloodPressure', 'Blood pressure', 'mmHg'],
  ['heartRate', 'Heart rate', 'bpm'],
  ['temperature', 'Temperature', '°F'],
  ['weight', 'Weight', 'lb'],
  ['bmi', 'BMI', '']
];

export default function OverviewTab({ patient, notes, onCreateNote, onViewLabs }) {
  return (
    <Box>
      {patient.alerts.length > 0 && (
        <Stack spacing={1} mb={2}>
          {patient.alerts.map((alert) => (
            <Alert key={alert.title} severity={alert.severity}>
              <strong>{alert.title}</strong> — {alert.detail}
            </Alert>
          ))}
        </Stack>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MonitorHeartRoundedIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Latest vitals</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(patient.vitals.measuredAt, { hour: 'numeric', minute: '2-digit' })}
                    </Typography>
                    <Button size="small" startIcon={<ScienceRoundedIcon />} onClick={onViewLabs}>
                      View labs
                    </Button>
                  </Stack>
                </Stack>
                <Grid container spacing={1.5}>
                  {vitalLabels.map(([key, label, unit]) => (
                    <Grid key={key} size={{ xs: 6, sm: 4, md: 2.4 }}>
                      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="h6" fontWeight={750}>
                          {patient.vitals[key]} <Typography component="span" variant="caption">{unit}</Typography>
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={700}>Active problems</Typography>
                  <Button size="small" startIcon={<AddRoundedIcon />}>Add problem</Button>
                </Stack>
                <Stack spacing={1}>
                  {patient.conditions.length ? patient.conditions.map((condition) => (
                    <Stack
                      key={condition.code}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'grey.50' }}
                    >
                      <Box>
                        <Typography fontWeight={650}>{condition.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {condition.code} · Onset {formatDate(`${condition.onset}T00:00:00`)}
                        </Typography>
                      </Box>
                      <Chip label={condition.status} size="small" color="success" variant="outlined" />
                    </Stack>
                  )) : (
                    <Typography color="text.secondary">No active problems documented.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight={700}>Recent activity</Typography>
                  <HistoryRoundedIcon color="action" />
                </Stack>
                {[...notes, ...patient.recentActivity].slice(0, 5).map((activity, index) => (
                  <Box key={`${activity.date}-${activity.type}-${index}`}>
                    <Stack direction="row" spacing={2} py={1.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 92 }}>
                        {formatDate(`${activity.date.slice(0, 10)}T00:00:00`, { year: undefined })}
                      </Typography>
                      <Box>
                        <Typography fontWeight={650}>{activity.type}</Typography>
                        <Typography variant="body2" color="text.secondary">{activity.detail}</Typography>
                      </Box>
                    </Stack>
                    {index < Math.min(notes.length + patient.recentActivity.length, 5) - 1 && <Divider />}
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Card sx={{ background: 'linear-gradient(145deg, #0b5f73, #0d7b78)', color: 'white' }}>
              <CardContent>
                <EventRoundedIcon sx={{ opacity: 0.8 }} />
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Next appointment</Typography>
                <Typography variant="h6" fontWeight={750}>
                  {formatDate(patient.nextAppointment, { weekday: 'long' })}
                </Typography>
                <Typography sx={{ opacity: 0.86 }}>
                  {formatDate(patient.nextAppointment, { hour: 'numeric', minute: '2-digit' })}
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Care team</Typography>
                <Typography fontWeight={650}>{patient.primaryProvider}</Typography>
                <Typography variant="body2" color="text.secondary">Primary care provider</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">Insurance</Typography>
                <Typography fontWeight={650}>{patient.insurance}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1.5}>Preferred pharmacy</Typography>
                <Typography fontWeight={650}>{patient.pharmacy}</Typography>
              </CardContent>
            </Card>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddRoundedIcon />}
              onClick={onCreateNote}
            >
              New clinical note
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
