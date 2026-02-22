// This safely fakes the library so Next.js doesn't crash during the build
export const STATUS = { finished: 'finished', skipped: 'skipped', running: 'running' };
export const ACTIONS = { close: 'close', next: 'next', prev: 'prev' };
export const EVENTS = { stepAfter: 'step:after' };
export default function Joyride() { return null; }