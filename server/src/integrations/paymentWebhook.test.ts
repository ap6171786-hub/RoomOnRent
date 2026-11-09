import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPaymentWebhook } from './paymentWebhook.js';

describe('payment webhook signature verification', () => {
  const secret = 'local-webhook-test-secret';
  const body = Buffer.from('{"event":"payment.captured"}');

  it('accepts a matching HMAC signature', () => {
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyPaymentWebhook(body, signature, secret)).toBe(true);
  });

  it('rejects invalid signatures without comparing mismatched lengths', () => {
    expect(verifyPaymentWebhook(body, 'not-a-signature', secret)).toBe(false);
    expect(verifyPaymentWebhook(body, '0'.repeat(64), secret)).toBe(false);
  });
});
