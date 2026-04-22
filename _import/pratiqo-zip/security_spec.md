# Firestore Security Rules Specification - Mentora

## 1. Data Invariants
- A `User` can only read and write their own profile.
- `Teacher` profiles are publicly readable for exploration but only editable by the teacher themselves.
- `Bookings` can be read by both the student and the teacher involved.
- `Bookings` can only be created by the student.
- `Chats` can only be read/written by the participants.
- `Messages` can only be read/written by the chat participants.
- `senderId` in a message must match the authenticated user.

## 2. Dirty Dozen Payloads (Target: DENIED)

1. **Identity Theft (User):** Attempt to update `/users/someone-else` with my own UID.
2. **Identity Theft (Teacher):** Attempt to update `/teachers/teacher-1` when I am not teacher-1.
3. **Spoofing Booking:** Create a booking for `student-2` when I am `student-1`.
4. **Price Poisoning:** Create a booking with a price of -100.
5. **ID Poisoning:** Create a booking with an ID longer than 128 characters.
6. **Shadow Field:** Update a teacher profile with an undocumented field `isAdmin: true`.
7. **Cross-User Chat Read:** Attempt to read `/chats/chat-between-others` where I am not a participant.
8. **Impersonate Sender:** Send a message in a chat but set `senderId` to the other participant.
9. **Terminal State Bypass:** Update a `completed` booking back to `booked`.
10. **Immutable History:** Change the `createdAt` timestamp of an existing booking.
11. **Future Timestamp:** Create a message with a `timestamp` set to tomorrow's date.
12. **Blanket Query:** Query `/bookings` without filtering by `studentId` or `teacherId`.

## 3. Test Runner Concept
The tests will ensure that authentication, ownership, and schema validation are strictly enforced.
