import { randomUUID } from 'node:crypto';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type PaymentResult = { transactionReference: string; status: PaymentStatus; verifiedAt: Date | null };

export interface PaymentProvider {
  readonly name: 'mock' | 'razorpay';
  initiate(input: { amount: number; idempotencyKey: string }): Promise<PaymentResult>;
  verify(transactionReference: string, amount: number): Promise<boolean>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  async initiate(_input: { amount: number; idempotencyKey: string }): Promise<PaymentResult> {
    return { transactionReference: `demo_${randomUUID()}`, status: 'succeeded', verifiedAt: new Date() };
  }

  async verify(transactionReference: string, amount: number) {
    return transactionReference.startsWith('demo_') && amount > 0;
  }
}

export interface RazorpayGateway {
  createOrder(input: { amount: number; currency: 'INR'; receipt: string }): Promise<{ id: string }>;
  fetchOrder(id: string): Promise<{ id: string; amount: number; currency: string; status: string }>;
}

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;

  constructor(private readonly gateway: RazorpayGateway) {}

  async initiate(input: { amount: number; idempotencyKey: string }): Promise<PaymentResult> {
    const order = await this.gateway.createOrder({ amount: Math.round(input.amount * 100), currency: 'INR', receipt: input.idempotencyKey });
    return { transactionReference: order.id, status: 'pending', verifiedAt: null };
  }

  async verify(transactionReference: string, amount: number) {
    const order = await this.gateway.fetchOrder(transactionReference);
    return order.id === transactionReference && order.amount === Math.round(amount * 100) && order.currency === 'INR' && order.status === 'paid';
  }
}
