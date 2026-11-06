import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { formatDate } from '../../data/patients';

export default function MedicationsTab({ patient }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Medications</Typography>
          <Button startIcon={<AddRoundedIcon />}>Add medication</Button>
        </Stack>
        {patient.medications.length ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Medication</TableCell>
                  <TableCell>Dose</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patient.medications.map((medication) => (
                  <TableRow key={`${medication.name}-${medication.dose}`}>
                    <TableCell>
                      <Typography fontWeight={650}>{medication.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{medication.notes}</Typography>
                    </TableCell>
                    <TableCell>{medication.dose}</TableCell>
                    <TableCell>{medication.frequency}</TableCell>
                    <TableCell>{formatDate(`${medication.startDate}T00:00:00`)}</TableCell>
                    <TableCell><Chip label={medication.status} size="small" color="success" variant="outlined" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">No active medications documented.</Typography>
        )}
      </CardContent>
    </Card>
  );
}
