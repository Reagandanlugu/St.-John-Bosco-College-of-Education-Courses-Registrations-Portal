# Security Specification - SJB Course Registration Portal

## Data Invariants
- Only administrators can manage courses, programmes, and settings.
- Students can only read and write their own registration data.
- Registration is only allowed when the portal is open according to `settings/registration`.
- Administrators can view all student registrations.
- The primary owner (`reagandanlugu09@gmail.com`) cannot be removed from administrators.
- Timestamps must be server-generated.
- Emails must be verified.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a student record with a different `uid` than the authenticated user.
2. **State Shortcutting**: Attempt to register for courses when the portal is closed.
3. **Privilege Escalation**: A student attempting to write to the `admins` collection to promote themselves.
4. **Invalid Schema**: Attempt to save a student record without required fields like `indexNumber`.
5. **PII Leak**: A student attempting to read another student's record.
6. **Resource Poisoning**: Attempt to set an extremely long `fullName` (e.g., 1MB string).
7. **Bypassing Time Constraints**: Attempt to update `registrationEnd` as a student.
8. **Shadow Fields**: Attempt to add an `isAdmin: true` field to a student record.
9. **Fake Timestamps**: Attempt to provide a client-side `createdAt` timestamp.
10. **Admin Identity Spoofing**: An admin attempting to remove the primary owner.
11. **Invalid ID**: Attempt to use an invalid character in a document ID.
12. **Null List Injection**: Attempt to set `registeredCourses` to `null` instead of an array.

## Test Runner - `firestore.rules.test.ts`
(To be implemented in the next step)
