import { Document, Model, Schema, model } from "mongoose";
import { SessionStatusEnum } from "../../utils/enums.utils";
import { ConversationDocument } from "./conversation.model";

interface SessionDocument extends Partial<Document> {
  status: SessionStatusEnum;
  duration: number; // in milliseconds
  conversation: string | ConversationDocument;
  parentConversation: string | ConversationDocument;
}
const collectionName = "Sessions";
const sessionSchema = new Schema<SessionDocument>(
  {
    status: {
      type: String,
      required: true,
      enum: Array.from(Object.values(SessionStatusEnum)),
    },
    duration: { type: Number, required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversations" },
    parentConversation: { type: Schema.Types.ObjectId, ref: "Conversations" },
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

const Session: Model<SessionDocument> = model(collectionName, sessionSchema);
export { Session };
export type { SessionDocument };
