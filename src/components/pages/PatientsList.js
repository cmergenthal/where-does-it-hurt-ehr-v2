import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { formatDate, getAge } from '../../data/patients';

export default function PatientsList({ patients, onSelectPatient }) {
  const [query, setQuery] = useState('');

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return patients;
    }

    return patients.filter((patient) =>
      [patient.name, patient.id, patient.mrn, patient.phone, patient.primaryProvider]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [patients, query]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={750}>Patients</Typography>
          <Typography color="text.secondary">
            Search and open a patient chart.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddAltRoundedIcon />}>
          Add patient
        </Button>
      </Stack>

      <TextField
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, MRN, patient ID, phone, or provider"
        inputProps={{ 'aria-label': 'Search patients' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon color="action" />
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      <Stack spacing={1.5}>
        {filteredPatients.map((patient) => (
          <Card
            key={patient.id}
            variant="outlined"
            role="button"
            tabIndex={0}
            onClick={() => onSelectPatient(patient)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                onSelectPatient(patient);
              }
            }}
            sx={{
              p: 2,
              cursor: 'pointer',
              transition: '160ms ease',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 8px 24px rgba(15, 44, 68, 0.08)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar alt={patient.name} src={patient.photo} sx={{ width: 52, height: 52 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 1 }} alignItems={{ md: 'center' }}>
                  <Typography fontWeight={700}>{patient.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {patient.pronouns} · {getAge(patient.dob)} years
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {patient.mrn} · DOB {formatDate(`${patient.dob}T00:00:00`)} · {patient.phone}
                </Typography>
              </Box>
              <Chip
                label={patient.primaryProvider.replace('Dr. ', '')}
                size="small"
                variant="outlined"
                sx={{ display: { xs: 'none', md: 'flex' } }}
              />
              <ChevronRightRoundedIcon color="action" />
            </Stack>
          </Card>
        ))}
      </Stack>

      {filteredPatients.length === 0 && (
        <Card variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h6">No patients found</Typography>
          <Typography color="text.secondary">Try another name, identifier, or provider.</Typography>
        </Card>
      )}
    </Box>
  );
}
