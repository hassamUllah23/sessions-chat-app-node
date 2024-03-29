import { Document, Model, Schema, model } from "mongoose";
import { UserDocument } from "./user.model";
import { ConversationDocument } from "./conversation.model";

interface MessageDocument extends Partial<Document> {
  _id?: string;
  text?: string;
  attachment?: string;
  sender: UserDocument | string;
  conversation: ConversationDocument | string;
  createdAt?: Date;
  updatedAt?: Date;
}
const collectionName = "Messages";
const messageSchema = new Schema<MessageDocument>(
  {
    text: { type: String, required: false, default: undefined, trim: true },
    attachment: { type: String, required: false, default: undefined },
    sender: { type: Schema.Types.ObjectId, ref: "Users" },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversations" },
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

const Message: Model<MessageDocument> = model(collectionName, messageSchema);
export { Message };
export type { MessageDocument };
