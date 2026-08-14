import { sleep } from './mock.js';

// No server and no payment provider: this function is the seam where both would go.
// It fails sometimes on purpose — a checkout that always succeeds never gets its
// error path written.
const DECLINE_RATE = 0.2;

export async function placeOrder(order) {
  await sleep();

  if (Math.random() < DECLINE_RATE) {
    throw new Error('The payment was declined. Nothing has been charged.');
  }

  return {
    ...order,
    reference: `SH-${Date.now().toString(36).toUpperCase()}`,
  };
}
