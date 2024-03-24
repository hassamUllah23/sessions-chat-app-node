import { Document, Model, Schema, model } from "mongoose";

interface UserDocument extends Partial<Document> {
  _id?: string;
  email: string;
  password: string;
  username: string;
  name: string;
  contacts?: Array<UserDocument | string>;
  blockList?: Array<UserDocument | string>;
  settings?: {
    theme: "light" | "dark";
    notifications: boolean;
  };
  firebaseToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
const collectionName = "Users";
const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    contacts: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    blockList: [{ type: Schema.Types.ObjectId, ref: "Users" }],
    settings: {
      theme: {
        type: String,
        required: false,
        enum: ["light", "dark"],
        default: "light",
      },
      notifications: { type: Boolean, required: false, default: true },
    },
    firebaseToken: { type: String, required: false, default: undefined },
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

const User: Model<UserDocument> = model(collectionName, userSchema);
export { User };
export type { UserDocument };
