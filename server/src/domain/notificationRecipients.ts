interface RecipientCandidate {
  id: number;
}

export const selectNotificationRecipientIds = (
  users: RecipientCandidate[],
  excludeUserId?: number,
): number[] => [...new Set(
  users
    .map((user) => Number(user.id))
    .filter((id) => Number.isInteger(id) && (excludeUserId === undefined || id !== Number(excludeUserId))),
)];

export const isDifferentUser = (recipientId: number, actorId?: number): boolean =>
  actorId === undefined || Number(recipientId) !== Number(actorId);
