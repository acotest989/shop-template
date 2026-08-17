export function toUser(record) {
  return {
    id: record.id,
    name: record.name || record.email.split('@')[0],
    email: record.email,
  };
}