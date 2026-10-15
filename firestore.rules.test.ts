/**
 * Adversarial Security Rules Specification Tests (Dirty Dozen Verification)
 * Verifies that all 12 Dirty Dozen payloads in security_spec.md are denied.
 */
export const DIRTY_DOZEN_TEST_CASES = [
  { id: 1, name: 'Self-Admin Escalation on /users/{uid}', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'PII Harvesting on /users/{otherUid}', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Shadow Field Injection via hasOnly()', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Unverified Email Admin Spoof', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Fake Active Subscription by Client', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Self-Approved Quote Discount by Client', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Terminal State Mutation on Accepted Quote', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'ID Poisoning and Oversized String', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Fake Published Testimonial by Client', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Forged Timestamp on Document Creation', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Cross-Tenant Quote List Scraping', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Audit Log Tampering (Update/Delete)', expected: 'PERMISSION_DENIED' },
];
