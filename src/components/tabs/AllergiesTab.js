import {
  Alert,
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

export default function AllergiesTab({ patient }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Allergies and intolerances</Typography>
          <Button startIcon={<AddRoundedIcon />}>Add allergy</Button>
        </Stack>
        {patient.allergies.length ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Substance</TableCell>
                  <TableCell>Reaction</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>First noted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patient.allergies.map((allergy) => (
                  <TableRow key={allergy.substance}>
                    <TableCell><Typography fontWeight={700}>{allergy.substance}</Typography></TableCell>
                    <TableCell>{allergy.reaction}</TableCell>
                    <TableCell><Chip label={allergy.severity} size="small" color="error" variant="outlined" /></TableCell>
                    <TableCell>{formatDate(`${allergy.firstNoted}T00:00:00`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="success">No known allergies documented.</Alert>
        )}
      </CardContent>
    </Card>
  );
}
