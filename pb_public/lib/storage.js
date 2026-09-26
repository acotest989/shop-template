// Live Server puts every project on the same origin, so an unprefixed 'cart' or
// 'token' would be shared with the next app served from localhost.
const APP = 'shop';

export const storageKey = (name) => `${APP}_${name}`;
