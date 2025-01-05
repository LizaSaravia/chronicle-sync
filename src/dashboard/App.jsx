import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import React, { useState, useEffect } from 'react';

function App() {
  const [history, setHistory] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    visitTime: '',
    hostName: '',
    os: ''
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('https://api.chroniclesync.xyz/history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({
      url: '',
      title: '',
      visitTime: new Date().toISOString(),
      hostName: '',
      os: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      url: item.url,
      title: item.title,
      visitTime: item.visitTime,
      hostName: item.hostName,
      os: item.os
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem 
        ? `https://api.chroniclesync.xyz/history/${editItem.id}`
        : 'https://api.chroniclesync.xyz/history';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      setOpenDialog(false);
      fetchHistory();
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Chronicle Sync Dashboard
          </Typography>
          <IconButton 
            color="inherit" 
            onClick={handleAdd}
            aria-label="add history entry"
          >
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Visit Time</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>OS</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>{item.url}</TableCell>
                  <TableCell>{new Date(item.visitTime).toLocaleString()}</TableCell>
                  <TableCell>{item.hostName}</TableCell>
                  <TableCell>{item.os}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(item)}
                      size="small"
                      aria-label="edit"
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editItem ? 'Edit History Entry' : 'Add History Entry'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Visit Time"
              type="datetime-local"
              value={formData.visitTime.slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Host Name"
              value={formData.hostName}
              onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Operating System"
              value={formData.os}
              onChange={(e) => setFormData({ ...formData, os: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editItem ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;