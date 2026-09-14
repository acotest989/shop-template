import { pb } from './pb.js';
import { toFaq, toQuestion } from '../models/chat.js';

export async function fetchFaqs() {
  const records = await pb.collection('faqs').getFullList({
    fields: 'id,question,answer',
    sort: 'position',
  });
  return records.map(toFaq);
}

// The chat collections refuse every write, so a question goes to the hook's route. What
// comes back is how many a guest has left; a signed-in customer gets null.
export async function sendQuestion(question) {
  const answer = await pb.send('/api/shop/chat', {
    method: 'POST',
    body: toQuestion(question),
  });
  return { left: answer.left ?? null };
}
