import { Document, Model, Schema, model } from "mongoose";
import { InviteStatusEnum } from "../../utils/enums.utils";
import { UserDocument } from "./user.model";
import { ConversationDocument } from "./conversation.model";

interface InviteDocument extends Partial<Document> {
  _id?: string;
  status: InviteStatusEnum;
  adminId: string | UserDocument;
  inviteeId: string | UserDocument;
  conversationId: string | ConversationDocument;
  createdAt?: Date;
  updatedAt?: Date;
}
const collectionName = "Invites";
const inviteSchema = new Schema<InviteDocument>(
  {
    status: {
      type: String,
      enum: Array.from(Object.values(InviteStatusEnum)),
      default: InviteStatusEnum.pending,
    },
    adminId: { type: Schema.Types.ObjectId, required: true, ref: "Users" },
    inviteeId: { type: Schema.Types.ObjectId, required: true, ref: "Users" },
    conversationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Conversations",
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

const Invite: Model<InviteDocument> = model(collectionName, inviteSchema);
export { Invite };
export type { InviteDocument };
