export type KairaChatRequestCoordinationIdentity = {
  requestId: string;
  coordinationRequestId: string;
  replayable: boolean;
};

export function resolveKairaChatRequestCoordinationIdentity(
  incomingRequestId: unknown,
  makeInternalId: () => string,
): KairaChatRequestCoordinationIdentity {
  const requestId =
    typeof incomingRequestId === 'string'
      ? incomingRequestId.trim().slice(0, 160)
      : '';

  if (requestId) {
    return {
      requestId,
      coordinationRequestId: requestId,
      replayable: true,
    };
  }

  const internalId = makeInternalId().trim();
  if (!internalId) {
    throw new Error('Internal chat coordination identity is required');
  }

  return {
    requestId: '',
    coordinationRequestId: `internal:${internalId}`,
    replayable: false,
  };
}
