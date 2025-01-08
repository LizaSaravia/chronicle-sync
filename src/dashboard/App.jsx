import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";

import { Login } from "./components/Login";
import { getApiBase } from "./config";
import { AuthService } from "./services/auth";

function App() {
  const apiBase = getApiBase();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    AuthService.isAuthenticated(),
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    visitTime: new Date().toISOString(),
    hostName: "",
    os: "",
  });

  // Check online status
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (!isOnline) {
      const error = new Error("Network is offline");
      console.error("Error fetching history:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = AuthService.getToken();
      const groupId = AuthService.getGroupId();

      if (!token || !groupId) {
        AuthService.clearAuth();
        setIsAuthenticated(false);
        throw new Error("Authentication required");
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        process.env.NODE_ENV === "test" ? 50 : 5000,
      );

      try {
        const response = await fetch(`${apiBase}/api/history/${groupId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            AuthService.clearAuth();
            setIsAuthenticated(false);
            throw new Error("Authentication expired. Please log in again.");
          }
          throw new Error("Failed to fetch history data");
        }

        const data = await response.json();
        setHistory(data);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timed out");
        }
        throw error;
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormData({
      url: "",
      title: "",
      visitTime: new Date().toISOString(),
      hostName: "",
      os: "",
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
      os: item.os,
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const method = editItem ? "PUT" : "POST";
      const url = editItem
        ? `${apiBase}/api/history/${editItem.id}`
        : `${apiBase}/api/history`;

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      setOpenDialog(false);
      fetchHistory();
    } catch (error) {
      console.error("Error saving history:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={() => {
          setIsAuthenticated(true);
          fetchHistory();
        }}
      />
    );
  }

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
          <Button
            color="inherit"
            onClick={() => {
              AuthService.clearAuth();
              setIsAuthenticated(false);
              setHistory([]);
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Typography>Loading history...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ mt: 4 }}>
            <Paper
              sx={{ p: 3, bgcolor: "error.light", color: "error.contrastText" }}
            >
              <Typography>{error}</Typography>
            </Paper>
          </Box>
        ) : history.length === 0 ? (
          <Box sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography>
                No browsing history found for this sync group.
              </Typography>
            </Paper>
          </Box>
        ) : (
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
                    <TableCell>
                      {new Date(item.visitTime).toLocaleString(undefined, {
                        timeZoneName: "short",
                      })}
                    </TableCell>
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
        )}
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editItem ? "Edit History Entry" : "Add History Entry"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              label="URL"
              value={formData.url}
              onChange={(e) =>
                setFormData({ ...formData, url: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Visit Time"
              type="datetime-local"
              value={formData.visitTime.slice(0, 16)}
              onChange={(e) =>
                setFormData({ ...formData, visitTime: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Host Name"
              value={formData.hostName}
              onChange={(e) =>
                setFormData({ ...formData, hostName: e.target.value })
              }
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
            {editItem ? "Save" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
