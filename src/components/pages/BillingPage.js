import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Drawer,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { claimStatuses, claims as initialClaims, currency } from '../../data/billing';
import { formatDate } from '../../data/patients';

const statusColors = {
  Draft: 'default',
  'Insurance pending': 'info',
  Denied: 'error',
  'Patient due': 'warning',
  Paid: 'success'
};

const summaryCard = (label, value, icon, color) => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={800} mt={0.5}>{value}</Typography>
        </Box>
        <Box sx={{ color, backgroundColor: `${color}14`, p: 1, borderRadius: 2, height: 42 }}>{icon}</Box>
      </Stack>
    </CardContent>
  </Card>
);

export default function BillingPage() {
  const [claims, setClaims] = useState(initialClaims);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [notice, setNotice] = useState('');

  const filteredClaims = useMemo(() => claims.filter((claim) => {
    const normalizedQuery = query.trim().toLowerCase();
    const queryMatches = !normalizedQuery ||
      [claim.id, claim.patientName, claim.payer, claim.provider]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    const statusMatches = status === 'All statuses' || claim.status === status;
    return queryMatches && statusMatches;
  }), [claims, query, status]);

  const patientDue = claims.reduce((sum, claim) =>
    sum + Math.max(claim.patientResponsibility - claim.patientPaid, 0), 0
  );
  const insurancePending = claims
    .filter((claim) => claim.status === 'Insurance pending')
    .reduce((sum, claim) => sum + claim.billed, 0);
  const deniedAmount = claims
    .filter((claim) => claim.status === 'Denied')
    .reduce((sum, claim) => sum + claim.billed, 0);
  const collected = claims.reduce((sum, claim) => sum + claim.insurancePaid + claim.patientPaid, 0);

  const aging = [
    { label: '0–30 days', value: 62 },
    { label: '31–60 days', value: 30 },
    { label: '61–90 days', value: 0 },
    { label: '90+ days', value: 0 }
  ];

  const updateClaimStatus = (claimId, nextStatus, message) => {
    setClaims((current) => current.map((claim) =>
      claim.id === claimId ? { ...claim, status: nextStatus } : claim
    ));
    setSelectedClaim((current) => current?.id === claimId ? { ...current, status: nextStatus } : current);
    setNotice(message);
  };

  const recordPayment = (claim) => {
    setClaims((current) => current.map((item) =>
      item.id === claim.id
        ? { ...item, patientPaid: item.patientResponsibility, status: 'Paid' }
        : item
    ));
    setSelectedClaim({ ...claim, patientPaid: claim.patientResponsibility, status: 'Paid' });
    setNotice('Patient payment recorded.');
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={750}>Billing and claims</Typography>
          <Typography color="text.secondary">Revenue cycle overview and claim follow-up.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setNotice('New claim workflow queued for the next encounter.')}>
          New claim
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {summaryCard('Patient responsibility', currency(patientDue), <AttachMoneyRoundedIcon />, '#e57b25')}
        {summaryCard('Insurance pending', currency(insurancePending), <HourglassTopRoundedIcon />, '#1976d2')}
        {summaryCard('Denied claims', currency(deniedAmount), <ErrorOutlineRoundedIcon />, '#d32f2f')}
        {summaryCard('Payments collected', currency(collected), <AttachMoneyRoundedIcon />, '#2e7d32')}
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Patient balance aging</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {aging.map((bucket) => (
              <Box key={bucket.label} sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">{bucket.label}</Typography>
                <Typography fontWeight={800}>{currency(bucket.value)}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mb={2}>
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search claims, patients, payers, or providers"
          inputProps={{ 'aria-label': 'Search claims' }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>
          }}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(event) => setStatus(event.target.value)}>
            {claimStatuses.map((claimStatus) => (
              <MenuItem key={claimStatus} value={claimStatus}>{claimStatus}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Card variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Claim</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Payer</TableCell>
                <TableCell>Billed</TableCell>
                <TableCell>Patient due</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClaims.map((claim) => (
                <TableRow
                  key={claim.id}
                  hover
                  onClick={() => setSelectedClaim(claim)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography fontWeight={700}>{claim.id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(`${claim.encounterDate}T00:00:00`)}
                    </Typography>
                  </TableCell>
                  <TableCell>{claim.patientName}</TableCell>
                  <TableCell>{claim.payer}</TableCell>
                  <TableCell>{currency(claim.billed)}</TableCell>
                  <TableCell>{currency(Math.max(claim.patientResponsibility - claim.patientPaid, 0))}</TableCell>
                  <TableCell><Chip label={claim.status} size="small" color={statusColors[claim.status]} variant="outlined" /></TableCell>
                </TableRow>
              ))}
              {filteredClaims.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No claims match these filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Drawer
        anchor="right"
        open={Boolean(selectedClaim)}
        onClose={() => setSelectedClaim(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 3 } }}
      >
        {selectedClaim && (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="text.secondary">Claim detail</Typography>
              <Typography variant="h5" fontWeight={800}>{selectedClaim.id}</Typography>
              <Chip label={selectedClaim.status} color={statusColors[selectedClaim.status]} sx={{ mt: 1 }} />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" fontWeight={700}>{selectedClaim.patientName}</Typography>
              <Typography color="text.secondary">
                Encounter {formatDate(`${selectedClaim.encounterDate}T00:00:00`)} · {selectedClaim.provider}
              </Typography>
              <Typography color="text.secondary">{selectedClaim.payer}</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                ['Billed', selectedClaim.billed],
                ['Insurance paid', selectedClaim.insurancePaid],
                ['Adjustments', selectedClaim.adjustments],
                ['Patient paid', selectedClaim.patientPaid],
                ['Patient responsibility', selectedClaim.patientResponsibility]
              ].map(([label, value]) => (
                <Box key={label} sx={{ p: 1.5, backgroundColor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography fontWeight={750}>{currency(value)}</Typography>
                </Box>
              ))}
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">CPT codes</Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                {selectedClaim.cpt.map((code) => <Chip key={code} label={code} size="small" />)}
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={2}>Diagnosis codes</Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                {selectedClaim.diagnoses.map((code) => <Chip key={code} label={code} size="small" variant="outlined" />)}
              </Stack>
            </Box>

            {selectedClaim.denialReason && (
              <Box sx={{ p: 2, backgroundColor: '#fff1f0', borderRadius: 2 }}>
                <Typography fontWeight={750} color="error.main">Denial reason</Typography>
                <Typography variant="body2">{selectedClaim.denialReason}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="body2" color="text.secondary">Billing note</Typography>
              <Typography>{selectedClaim.notes}</Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {selectedClaim.status === 'Denied' && (
                <Button
                  variant="contained"
                  startIcon={<SendRoundedIcon />}
                  onClick={() => updateClaimStatus(selectedClaim.id, 'Insurance pending', 'Claim corrected and resubmitted.')}
                >
                  Resubmit claim
                </Button>
              )}
              {selectedClaim.status === 'Draft' && (
                <Button
                  variant="contained"
                  onClick={() => updateClaimStatus(selectedClaim.id, 'Insurance pending', 'Claim submitted to clearinghouse.')}
                >
                  Submit claim
                </Button>
              )}
              {selectedClaim.status === 'Patient due' && (
                <>
                  <Button variant="contained" onClick={() => recordPayment(selectedClaim)}>Record payment</Button>
                  <Button variant="outlined" onClick={() => setNotice('Patient statement generated.')}>Generate statement</Button>
                </>
              )}
              <Button variant="text" onClick={() => setSelectedClaim(null)}>Close</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice('')} message={notice} />
    </Box>
  );
}
