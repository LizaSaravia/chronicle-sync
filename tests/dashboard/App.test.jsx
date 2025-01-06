/** @jest-environment jsdom */
import { ThemeProvider, createTheme } from '@mui/material/styles/index.js';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import App from '../../src/dashboard/App.jsx';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Mock fetch globally
global.fetch = vi.fn();

describe('App', () => {
  beforeEach(() => {
    fetch.mockReset();
    // Default mock for fetch to return empty array
    fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  it('renders the dashboard title', () => {
    render(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    );
    expect(screen.getByText('Chronicle Sync Dashboard')).toBeInTheDocument();
  });

  it('loads and displays history data', async () => {
    const mockHistory = [
      {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        visitTime: '2024-01-05T12:00:00Z',
        hostName: 'laptop-1',
        os: 'Windows 10'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHistory
    });

    render(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('laptop-1')).toBeInTheDocument();
      expect(screen.getByText('Windows 10')).toBeInTheDocument();
    });
  });

  it('opens add dialog when clicking add button', async () => {
    render(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    );
    
    const addButton = screen.getByLabelText('add history entry');
    fireEvent.click(addButton);

    expect(screen.getByText('Add History Entry')).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Host Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Operating System')).toBeInTheDocument();
  });

  it('submits new history entry', async () => {
    const newEntry = {
      url: 'https://test.com',
      title: 'Test Site',
      visitTime: '2024-01-05T14:00:00',
      hostName: 'desktop-1',
      os: 'macOS'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    fetch.mockResolvedValueOnce({
      ok: true
    });

    render(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    );
    
    // Open add dialog
    fireEvent.click(screen.getByLabelText('add history entry'));

    // Fill form
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: newEntry.url } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: newEntry.title } });
    fireEvent.change(screen.getByLabelText('Host Name'), { target: { value: newEntry.hostName } });
    fireEvent.change(screen.getByLabelText('Operating System'), { target: { value: newEntry.os } });

    // Submit form
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://api.chroniclesync.xyz/api/history',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(newEntry.url)
        })
      );
    });
  });
});