// Where a link asked to come back to once the visitor has signed in or registered:
// /login?next=/products/some-handle. The guard's own memory only covers pages it turned
// away, and a product page turns nobody away.
//
// Only a path on this site. A crafted link must not send somebody elsewhere the moment they
// have typed their password, and //host or /\host would do exactly that.
export function nextPath() {
  const next = new URLSearchParams(location.search).get('next') ?? '';
  return /^\/(?![/\\])/.test(next) ? next : null;
}
