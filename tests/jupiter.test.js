import { test } from 'node:test';
import assert from 'node:assert';
import { getQuoteHandler, buildSwapTransactionHandler, sendSwapTransactionHandler } from '../build/handlers/jupiter.js';

test('getQuoteHandler should return an error for invalid input mint', async () => {
  const result = await getQuoteHandler({
    inputMint: 'invalid-mint',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    amount: '1000000'
  });
  
  assert.strictEqual(result.isError, true);
  assert.strictEqual(result.content[0].text.includes('Invalid public key'), true);
});

test('buildSwapTransactionHandler should return an error for invalid user public key', async () => {
  const result = await buildSwapTransactionHandler({
    quoteResponse: '{}',
    userPublicKey: 'invalid-public-key'
  });
  
  assert.strictEqual(result.isError, true);
  assert.strictEqual(result.content[0].text.includes('Invalid public key'), true);
});

test('sendSwapTransactionHandler should return an error when neither swapTransaction nor serializedTransaction is provided', async () => {
  const result = await sendSwapTransactionHandler({});
  
  assert.strictEqual(result.isError, true);
  assert.strictEqual(result.content[0].text.includes('Either swapTransaction or serializedTransaction must be provided'), true);
});
