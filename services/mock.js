// Fake latency so loading states stay visible. Its importers are the list of what is still mocked.

export const MOCK_LATENCY = 700;

export const sleep = (ms = MOCK_LATENCY) => new Promise((resolve) => setTimeout(resolve, ms));
