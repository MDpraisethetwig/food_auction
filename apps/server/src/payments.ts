import Stripe from 'stripe';
import { config } from './config.js';

export interface ChargeResult {
  ok: boolean;
  paymentId?: string;
  error?: string;
}

export interface PayerCard {
  stripeCustomerId: string | null;
  paymentMethodId: string | null;
}

export interface PaymentProvider {
  mode: 'stripe' | 'mock';
  charge(payer: PayerCard, amountCents: number, idempotencyKey: string): Promise<ChargeResult>;
  refund(paymentId: string, amountCents: number): Promise<string | null>;
}

// Used when no Stripe key is set, so tests and demos can run offline.
const mockProvider: PaymentProvider = {
  mode: 'mock',
  async charge(payer, _amountCents, idempotencyKey) {
    if (!payer.paymentMethodId || payer.paymentMethodId === 'mock_declined') {
      return { ok: false, error: 'Card declined' };
    }
    return { ok: true, paymentId: `mock_pay_${idempotencyKey}` };
  },
  async refund(paymentId) {
    return `mock_refund_${paymentId}`;
  },
};

export const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

const stripeProvider = (client: Stripe): PaymentProvider => ({
  mode: 'stripe',
  async charge(payer, amountCents, idempotencyKey) {
    if (!payer.stripeCustomerId || !payer.paymentMethodId) {
      return { ok: false, error: 'No saved card' };
    }
    try {
      const intent = await client.paymentIntents.create(
        {
          amount: amountCents,
          currency: 'cad',
          customer: payer.stripeCustomerId,
          payment_method: payer.paymentMethodId,
          off_session: true,
          confirm: true,
        },
        { idempotencyKey },
      );
      return intent.status === 'succeeded'
        ? { ok: true, paymentId: intent.id }
        : { ok: false, error: `Payment ${intent.status}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Charge failed' };
    }
  },
  async refund(paymentId, amountCents) {
    const refund = await client.refunds.create({ payment_intent: paymentId, amount: amountCents });
    return refund.id;
  },
});

export let payments: PaymentProvider = stripe ? stripeProvider(stripe) : mockProvider;

export function setPaymentProvider(provider: PaymentProvider) {
  payments = provider;
}
