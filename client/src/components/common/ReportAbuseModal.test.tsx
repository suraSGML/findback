import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api.js';
import { ReportAbuseModal } from './ReportAbuseModal.js';

vi.mock('../../services/api.js', () => ({
  api: { post: vi.fn() },
}));

describe('ReportAbuseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the selected content report and closes on success', async () => {
    vi.mocked(api.post).mockResolvedValue({ success: true });
    const onClose = vi.fn();
    render(<ReportAbuseModal targetType="FOUND_REPORT" targetId="507f1f77bcf86cd799439011" onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Details (optional)'), {
      target: { value: 'The photos and description appear to be copied.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reports', {
        targetType: 'FOUND_REPORT',
        targetId: '507f1f77bcf86cd799439011',
        reason: 'Suspicious or fraudulent content',
        details: 'The photos and description appear to be copied.',
      });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
