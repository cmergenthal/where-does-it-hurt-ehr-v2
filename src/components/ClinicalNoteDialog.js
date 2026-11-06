import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';

const emptyNote = {
  type: 'Progress note',
  reason: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: ''
};

export default function ClinicalNoteDialog({ open, patient, onClose, onSave }) {
  const [note, setNote] = useState(emptyNote);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setNote(emptyNote);
      setSubmitted(false);
    }
  }, [open]);

  const updateField = (field) => (event) => {
    setNote((current) => ({ ...current, [field]: event.target.value }));
  };

  const isValid = note.reason.trim() && note.assessment.trim() && note.plan.trim();

  const handleSave = (status) => {
    setSubmitted(true);
    if (!isValid) return;
    onSave(note, status);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        New clinical note
        <Typography variant="body2" color="text.secondary">
          {patient.name} · {patient.mrn}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25} mt={0.5}>
          <FormControl fullWidth>
            <InputLabel id="note-type-label">Note type</InputLabel>
            <Select
              labelId="note-type-label"
              value={note.type}
              label="Note type"
              onChange={updateField('type')}
            >
              <MenuItem value="Progress note">Progress note</MenuItem>
              <MenuItem value="Telephone encounter">Telephone encounter</MenuItem>
              <MenuItem value="Care coordination">Care coordination</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Reason for visit"
            value={note.reason}
            onChange={updateField('reason')}
            required
            error={submitted && !note.reason.trim()}
            helperText={submitted && !note.reason.trim() ? 'Reason for visit is required.' : ''}
          />
          <TextField label="Subjective" value={note.subjective} onChange={updateField('subjective')} multiline minRows={3} />
          <TextField label="Objective" value={note.objective} onChange={updateField('objective')} multiline minRows={3} />
          <TextField
            label="Assessment"
            value={note.assessment}
            onChange={updateField('assessment')}
            multiline
            minRows={3}
            required
            error={submitted && !note.assessment.trim()}
          />
          <TextField
            label="Plan"
            value={note.plan}
            onChange={updateField('plan')}
            multiline
            minRows={3}
            required
            error={submitted && !note.plan.trim()}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="outlined" onClick={() => handleSave('draft')}>Save draft</Button>
        <Button variant="contained" onClick={() => handleSave('signed')}>Sign note</Button>
      </DialogActions>
    </Dialog>
  );
}
