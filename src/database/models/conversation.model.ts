import { Document, Model, Schema, model } from "mongoose";
import { Message, MessageDocument } from "./message.model";
import { Participant, ParticipantDocument } from "./participant.model";
import { SessionDocument } from "./session.model";

interface ConversationDocument extends Partial<Document> {
  _id?: string;
  name?: string | undefined;
  isGroup?: boolean;
  isSession?: boolean;
  messages: Array<MessageDocument>;
  latestMessage?: MessageDocument | string | undefined | null;
  participants: Array<ParticipantDocument>;
  session?: string | SessionDocument;
  createdAt?: Date;
  updatedAt?: Date;
}
const collectionName = "Conversations";
const conversationSchema = new Schema<ConversationDocument>(
  {
    name: { type: String, required: false, default: undefined, trim: true },
    isGroup: { type: Boolean, required: false, default: false },
    isSession: { type: Boolean, required: false, default: false },
    participants: [Participant.schema],
    messages: [Message.schema],
    latestMessage: {
      type: Schema.Types.ObjectId,
      required: false,
      default: undefined,
      ref: "Messages",
    },
    session: {
      type: Schema.Types.ObjectId,
      required: false,
      default: undefined,
      ref: "Sessions",
    },
  },
  {
    collection: collectionName,
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
    versionKey: false,
  },
);

const Conversation: Model<ConversationDocument> = model(
  collectionName,
  conversationSchema,
);
export { Conversation };
export type { ConversationDocument };
