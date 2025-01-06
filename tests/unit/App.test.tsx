import { ThemeProvider, createTheme } from '@mui/material';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import App from '../../src/dashboard/App';
import { AuthService } from '../../src/dashboard/services/auth';

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
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    mockConsoleError.mockClear();
  });
  beforeEach(() => {
    fetch.mockReset();
    // Default mock for fetch to return empty array
    fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    // Mock AuthService
    vi.spyOn(AuthService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(AuthService, 'getToken').mockReturnValue('mock-token');
    vi.spyOn(AuthService, 'getGroupId').mockReturnValue('mock-group');
  });

  it('renders the dashboard title', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });
    expect(screen.getByText('Chronicle Sync Dashboard')).toBeDefined();
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

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Example')).toBeDefined();
      expect(screen.getByText('https://example.com')).toBeDefined();
      expect(screen.getByText('laptop-1')).toBeDefined();
      expect(screen.getByText('Windows 10')).toBeDefined();
    });
  });

  it('opens add dialog when clicking add button', async () => {
    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });
    
    const addButton = screen.getByLabelText('add history entry');
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(screen.getByText('Add History Entry')).toBeDefined();
    expect(screen.getByLabelText('URL')).toBeDefined();
    expect(screen.getByLabelText('Title')).toBeDefined();
    expect(screen.getByLabelText('Host Name')).toBeDefined();
    expect(screen.getByLabelText('Operating System')).toBeDefined();
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

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });
    
    // Open add dialog
    await act(async () => {
      fireEvent.click(screen.getByLabelText('add history entry'));
    });

    // Fill form
    await act(async () => {
      fireEvent.change(screen.getByLabelText('URL'), { target: { value: newEntry.url } });
      fireEvent.change(screen.getByLabelText('Title'), { target: { value: newEntry.title } });
      fireEvent.change(screen.getByLabelText('Host Name'), { target: { value: newEntry.hostName } });
      fireEvent.change(screen.getByLabelText('Operating System'), { target: { value: newEntry.os } });
    });

    // Submit form
    await act(async () => {
      fireEvent.click(screen.getByText('Add'));
    });

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

  it('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching history:',
        expect.any(Error)
      );
    });
  });

  it('handles network timeout', async () => {
    fetch.mockImplementationOnce(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 100);
    }));

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching history:',
        expect.any(Error)
      );
    });
  });

  it('handles offline mode', async () => {
    // Simulate offline mode
    const originalOnline = window.navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true
    });

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching history:',
        expect.any(Error)
      );
    });

    // Restore online status
    Object.defineProperty(window.navigator, 'onLine', {
      value: originalOnline,
      writable: true
    });
  });
});