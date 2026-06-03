// ⚠️ TEST PHASE switch.
//
// When DEMO_OPEN_ACCESS is on (default during testing), anyone who joins a
// community is AUTO-APPROVED (status: active) and granted RABBI access, so
// testers immediately land inside a community and can see every feature.
//
// Turn OFF before real launch: set env DEMO_OPEN_ACCESS=false (then joins are
// pending + member, requiring rabbi approval — the real moderation flow).
export const DEMO_OPEN_ACCESS = process.env.DEMO_OPEN_ACCESS !== 'false';

/** Membership status + role to use for a new self-join, per the demo switch. */
export const newJoinMembership = () =>
  DEMO_OPEN_ACCESS
    ? { status: 'active', role: 'rabbi' }
    : { status: 'pending', role: 'member' };
