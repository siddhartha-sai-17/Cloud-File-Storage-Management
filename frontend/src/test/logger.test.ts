import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    logger.clearHistory();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('captures debug entries in history', () => {
    logger.debug('test debug msg', 'TestCtx');
    const history = logger.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].level).toBe('DEBUG');
    expect(history[0].message).toBe('test debug msg');
    expect(history[0].context).toBe('TestCtx');
  });

  it('captures info entries in history', () => {
    logger.info('test info msg');
    const history = logger.getHistory();
    expect(history[0].level).toBe('INFO');
  });

  it('captures warn entries in history', () => {
    logger.warn('test warn msg');
    const history = logger.getHistory();
    expect(history[0].level).toBe('WARN');
  });

  it('captures error entries in history', () => {
    logger.error('test error msg', 'ErrCtx', { code: 500 });
    const history = logger.getHistory();
    expect(history[0].level).toBe('ERROR');
    expect(history[0].metadata).toEqual({ code: 500 });
  });

  it('captures audit entries in history', () => {
    logger.audit('user deleted file');
    const history = logger.getHistory();
    expect(history[0].level).toBe('AUDIT');
  });

  it('trims history at maxLocalLogs (100)', () => {
    for (let i = 0; i < 110; i++) {
      logger.debug(`msg ${i}`);
    }
    // History should be capped at 100 entries
    expect(logger.getHistory().length).toBeLessThanOrEqual(100);
  });

  it('clears history correctly', () => {
    logger.info('entry to be cleared');
    logger.clearHistory();
    expect(logger.getHistory()).toHaveLength(0);
  });
});
