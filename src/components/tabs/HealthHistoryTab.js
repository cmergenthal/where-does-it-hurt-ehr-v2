import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { formatDate } from '../../data/patients';

export default function HealthHistoryTab({ patient }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>Problem history</Typography>
        <Stack spacing={1.25}>
          {patient.conditions.length ? patient.conditions.map((condition) => (
            <Box key={condition.code} sx={{ p: 2, borderRadius: 2, backgroundColor: 'grey.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={700}>{condition.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ICD-10 {condition.code} · Onset {formatDate(`${condition.onset}T00:00:00`)}
                  </Typography>
                </Box>
                <Chip label={condition.status} color="success" variant="outlined" size="small" />
              </Stack>
            </Box>
          )) : (
            <Typography color="text.secondary">No conditions documented.</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
