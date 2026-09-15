export function toUser(record) {
  return {
    id: record.id,
    name: record.name || record.email.split('@')[0],
    email: record.email,

    // Answers the chat from the inbox. Ticked in the dashboard only; the server checks it
    // again on every reply, so this decides what the page offers and nothing more.
    admin: record.admin === true,
  };
}
