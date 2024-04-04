import { ConversationDocument } from "../database/models/conversation.model";
import { ParticipantDocument } from "../database/models/participant.model";
import { UserDocument } from "../database/models/user.model";

function hasEmptyValues(data: Record<string, any>): boolean {
  const checkEmpty = (value: any): boolean => {
    if (typeof value === "object" && value !== null) {
      return hasEmptyValues(value);
    }
    return (
      value === undefined ||
      value === null ||
      value === 0 ||
      value === "" ||
      Number.isNaN(value) ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const element = data[key];
      if (checkEmpty(element)) {
        return true;
      }
    }
  }

  return false;
}

function extractOtherParticipants({
  conversation,
  senderId,
}: {
  conversation: ConversationDocument;
  senderId: string;
}): Array<ParticipantDocument> {
  return conversation.participants.filter(
    (participant) => (participant.user as UserDocument)._id !== senderId,
  );
}

function extractOtherParticipant({
  conversation,
  senderId,
}: {
  conversation: ConversationDocument;
  senderId: string;
}): ParticipantDocument | undefined {
  return conversation.participants.find(
    (participant) => (participant.user as UserDocument)._id !== senderId,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  hasEmptyValues,
  extractOtherParticipants,
  extractOtherParticipant,
  sleep,
};
