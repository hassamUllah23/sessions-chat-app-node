import { Document, Model, Schema, model } from "mongoose";
import { UserDocument } from "./user.model";

interface ParticipantDocument extends Partial<Document> {
  user: string | UserDocument;
  role?: "admin" | "user";
}
const collectionName = "Participants";
const participantSchema = new Schema<ParticipantDocument>(
  {
    role: {
      type: String,
      required: false,
      enum: ["admin", "member"],
      default: "member",
    },
    user: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    collection: collectionName,
    timestamps: false,
    versionKey: false,
    id: false,
    _id: false,
  },
);

const Participant: Model<ParticipantDocument> = model(
  collectionName,
  participantSchema,
);
export { Participant };
export type { ParticipantDocument };
