import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatDate } from '../../data/patients';
import { availableLabOrders, defaultLabPanels, labPanelsByPatient } from '../../data/labs';

const statusColors = {
  Final: 'success',
  Pending: 'warning',
  Collected: 'info',
  Ordered: 'default'
};

const flagColor = (flag) => {
  if (flag.toLowerCase().includes('critical')) return 'error';
  if (flag === 'High' || flag === 'Low') return 'warning';
  return 'success';
};

export default function LabResultsPage({ patient, requestedPanel, onManualPanelSelect }) {
  const [panels, setPanels] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [orderReason, setOrderReason] = useState('');
  const [notice, setNotice] = useState('');
  const panelRefs = useRef(new Map());

  useEffect(() => {
    const patientPanels = labPanelsByPatient[patient.id] || defaultLabPanels;
    setPanels(patientPanels.map((panel) => ({ ...panel, results: [...panel.results] })));
    setSelectedPanelId(patientPanels[0]?.id || '');
    setStatusFilter('All');
    setResultFilter('All');
  }, [patient.id]);

  useEffect(() => {
    const target = panels.find((panel) => panel.id === requestedPanel?.panelId);
    if (!target) return;

    setStatusFilter('All');
    setResultFilter('All');
    setSelectedPanelId(target.id);
    window.requestAnimationFrame(() => {
      panelRefs.current.get(target.id)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    });
  }, [panels, requestedPanel?.panelId, requestedPanel?.requestedAt]);

  const filteredPanels = useMemo(() => panels.filter((panel) => {
    const hasAbnormal = panel.results.some((result) => result.flag !== 'Normal');
    const hasCritical = panel.results.some((result) => result.critical);
    const statusMatches = statusFilter === 'All' || panel.status === statusFilter;
    const resultMatches =
      resultFilter === 'All' ||
      (resultFilter === 'Abnormal' && hasAbnormal) ||
      (resultFilter === 'Critical' && hasCritical) ||
      (resultFilter === 'Needs review' && panel.status === 'Final' && !panel.reviewed);

    return statusMatches && resultMatches;
  }), [panels, resultFilter, statusFilter]);

  const selectedPanel =
    panels.find((panel) => panel.id === selectedPanelId) ||
    filteredPanels[0] ||
    panels[0];

  const criticalPanels = panels.filter(
    (panel) => !panel.reviewed && panel.results.some((result) => result.critical)
  );

  const handleReview = (panelId) => {
    setPanels((current) => current.map((panel) =>
      panel.id === panelId ? { ...panel, reviewed: true } : panel
    ));
    setNotice('Result marked as reviewed.');
  };

  const handleOrder = () => {
    if (!selectedOrder) return;

    const order = {
      id: `LAB-${Date.now()}`,
      panel: selectedOrder,
      category: 'New order',
      status: 'Ordered',
      orderedAt: new Date().toISOString(),
      collectedAt: null,
      resultedAt: null,
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'To be collected',
      reviewed: false,
      results: [],
      reason: orderReason
    };

    setPanels((current) => [order, ...current]);
    setSelectedPanelId(order.id);
    setOrderOpen(false);
    setSelectedOrder('');
    setOrderReason('');
    setNotice(`${order.panel} ordered.`);
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
          <Typography variant="h4" fontWeight={750}>Laboratory</Typography>
          <Typography color="text.secondary">
            Orders, results, trends, and review status for {patient.name}.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOrderOpen(true)}>
          Order labs
        </Button>
      </Stack>

      {criticalPanels.map((panel) => {
        const criticalResult = panel.results.find((result) => result.critical);
        return (
          <Alert
            key={panel.id}
            severity="error"
            icon={<WarningAmberRoundedIcon />}
            action={
              <Button color="inherit" size="small" onClick={() => handleReview(panel.id)}>
                Acknowledge
              </Button>
            }
            sx={{ mb: 2 }}
          >
            <strong>Critical result:</strong> {criticalResult.name} {criticalResult.value} {criticalResult.unit}
            {' '}from {panel.panel}. Immediate clinical review required.
          </Alert>
        );
      })}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
            {['All', 'Ordered', 'Collected', 'Pending', 'Final'].map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Results</InputLabel>
          <Select value={resultFilter} label="Results" onChange={(event) => setResultFilter(event.target.value)}>
            {['All', 'Abnormal', 'Critical', 'Needs review'].map((filter) => (
              <MenuItem key={filter} value={filter}>{filter}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '340px minmax(0, 1fr)' }, gap: 2 }}>
        <Stack spacing={1.25}>
          {filteredPanels.map((panel) => {
            const abnormalCount = panel.results.filter((result) => result.flag !== 'Normal').length;
            return (
              <Card
                key={panel.id}
                ref={(node) => {
                  if (node) panelRefs.current.set(panel.id, node);
                  else panelRefs.current.delete(panel.id);
                }}
                variant="outlined"
                onClick={() => {
                  setSelectedPanelId(panel.id);
                  onManualPanelSelect?.(panel.id);
                }}
                sx={{
                  cursor: 'pointer',
                  borderColor: selectedPanel?.id === panel.id ? 'primary.main' : 'divider',
                  backgroundColor: selectedPanel?.id === panel.id ? 'primary.light' : 'background.paper'
                }}
              >
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography fontWeight={700}>{panel.panel}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(panel.orderedAt)}
                      </Typography>
                    </Box>
                    <Chip label={panel.status} size="small" color={statusColors[panel.status]} variant="outlined" />
                  </Stack>
                  <Stack direction="row" spacing={1} mt={1.25} alignItems="center">
                    {abnormalCount > 0 && (
                      <Chip label={`${abnormalCount} abnormal`} size="small" color="warning" />
                    )}
                    {panel.status === 'Final' && (
                      <Typography variant="caption" color={panel.reviewed ? 'success.main' : 'warning.main'}>
                        {panel.reviewed ? 'Reviewed' : 'Needs review'}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {filteredPanels.length === 0 && (
            <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No lab panels match these filters.</Typography>
            </Card>
          )}
        </Stack>

        {selectedPanel && (
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'flex-start' }}
                  spacing={2}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ScienceRoundedIcon color="primary" />
                      <Typography variant="h5" fontWeight={750}>{selectedPanel.panel}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {selectedPanel.id} · {selectedPanel.specimen} · {selectedPanel.performingLab}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ordered by {selectedPanel.orderingProvider} on {formatDate(selectedPanel.orderedAt)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={selectedPanel.status} color={statusColors[selectedPanel.status]} />
                    {selectedPanel.status === 'Final' && !selectedPanel.reviewed && (
                      <Button
                        variant="outlined"
                        startIcon={<CheckCircleRoundedIcon />}
                        onClick={() => handleReview(selectedPanel.id)}
                      >
                        Mark reviewed
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Analyte</TableCell>
                      <TableCell>Result</TableCell>
                      <TableCell>Reference range</TableCell>
                      <TableCell>Flag</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPanel.results.map((result) => (
                      <TableRow key={result.name} sx={result.critical ? { backgroundColor: '#fff1f0' } : undefined}>
                        <TableCell><Typography fontWeight={650}>{result.name}</Typography></TableCell>
                        <TableCell>
                          <Typography fontWeight={result.flag === 'Normal' ? 500 : 800}>
                            {result.value} {result.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{result.range}</TableCell>
                        <TableCell>
                          <Chip label={result.flag} size="small" color={flagColor(result.flag)} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedPanel.results.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography fontWeight={650}>Results are not available yet</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Current status: {selectedPanel.status}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {selectedPanel.trend && (
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ShowChartRoundedIcon color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        {selectedPanel.trendLabel || selectedPanel.panel} trend
                      </Typography>
                    </Stack>
                    {selectedPanel.trendUnit && (
                      <Chip label={selectedPanel.trendUnit} size="small" variant="outlined" />
                    )}
                  </Stack>
                  <Box sx={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedPanel.trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(date) => formatDate(`${date}T00:00:00`, { year: undefined })} />
                        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#087f7a" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}
      </Box>

      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Order laboratory testing</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Lab panel</InputLabel>
              <Select value={selectedOrder} label="Lab panel" onChange={(event) => setSelectedOrder(event.target.value)}>
                {availableLabOrders.map((order) => <MenuItem key={order} value={order}>{order}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Clinical reason"
              value={orderReason}
              onChange={(event) => setOrderReason(event.target.value)}
              multiline
              minRows={3}
            />
            <TextField label="Priority" value="Routine" disabled />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!selectedOrder} onClick={handleOrder}>Place order</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice('')} message={notice} />
    </Box>
  );
}
