import { Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';

import { getApiBase } from '../config';
import { AuthService } from '../services/auth';

export function Login({ onLogin }) {
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${getApiBase()}/api/auth/verify-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });

      if (!response.ok) {
        throw new Error('Invalid sync group ID');
      }

      const { token } = await response.json();
      AuthService.setAuth(token, groupId);
      onLogin();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Chronicle Sync Dashboard
          </Typography>
          <Typography variant="body1" gutterBottom>
            Enter your sync group ID to view browsing history
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            You can find your sync group ID in the Chronicle Sync extension's options page.
            Click the extension icon, then click "Options" to view it.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Sync Group ID"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              error={!!error}
              helperText={error}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !groupId}
            >
              {loading ? 'Verifying...' : 'View History'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}