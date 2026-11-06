// src/pages/DocumentsPage.jsx
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

export default function DocumentsPage({ patient }) {
  // Fake documents; in a real app you'd fetch by patient.id
  const docs = [
    { date: '2024-02-23', title: 'Discharge Summary', type: 'Clinical Note', uploadedBy: 'Dr. S. Reynolds' },
    { date: '2024-01-10', title: 'Lab Results: Lipid Panel', type: 'Lab Report', uploadedBy: 'LabCorp' },
    { date: '2024-01-02', title: 'EKG Report', type: 'Diagnostic', uploadedBy: 'Dr. A. Patel' },
    { date: '2023-11-30', title: 'Insurance Card', type: 'Insurance', uploadedBy: 'Patient' },
    { date: '2023-10-17', title: 'History & Physical', type: 'Clinical Note', uploadedBy: 'Dr. S. Reynolds' },
  ];

  return (
    <Box>


      {/* Patient header with photo */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            alt={patient.name}
            src={patient.photo}
            sx={{ width: 64, height: 64 }}
          />
          <Box sx={{ ml: 2 }}>
            <Typography variant="h6">{patient.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              DOB: {patient.dob} • ID: {patient.id}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Button variant="contained">Upload</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Documents table */}
      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Uploaded By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((doc, idx) => (
                <TableRow key={idx}>
                  <TableCell>{doc.date}</TableCell>
                  <TableCell>{doc.title}</TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>{doc.uploadedBy}</TableCell>
                  <TableCell>
                    <Button size="small">View</Button>{' '}
                    <Button size="small">Download</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
