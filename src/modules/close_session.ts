import mongoose, { Types } from "mongoose";
import { Config } from "../services/config.service";
import { Session } from "../database/models/session.model";
import { hasEmptyValues } from "../utils/functions.utils";
import { SessionStatusEnum } from "../utils/enums.utils";
import {
  Conversation,
  ConversationDocument,
} from "../database/models/conversation.model";
import { delete_session } from "./delete_session";
const { exec } = require("child_process");

interface ModuleParams {
  sessionId: string;
}
async function close_session({ sessionId }: ModuleParams) {
  console.log("Session closing process initiated for session ", sessionId);
  try {
    if (hasEmptyValues({ sessionId })) {
      throw Error("Session ID cannot be empty");
    } else {
      const { databaseConfig } = Config;
      await mongoose.connect(databaseConfig.uri, {
        dbName: databaseConfig.db, // Specify your desired database name
        auth: {
          username: databaseConfig.username,
          password: databaseConfig.password,
        },
      });

      const session = await Session.findOne({
        _id: new Types.ObjectId(sessionId),
        status: SessionStatusEnum.ongoing,
      }).populate("parentConversation");
      if (await session) {
        console.log(
          "going to close session after ",
          session?.duration.toString(),
          " milliseconds",
        );
        await new Promise((resolve: any): void => {
          setTimeout(async () => {
            const recheckSession = await Session.findOne({
              _id: session?._id,
              status: SessionStatusEnum.ongoing,
            });
            if (await recheckSession) {
              const updateResult = await Session.updateOne(
                { _id: recheckSession?._id },
                { status: SessionStatusEnum.closed },
              );
              if (updateResult.modifiedCount === 1) {
                console.log(
                  "Session ",
                  sessionId,
                  " closed after ",
                  recheckSession?.duration.toString(),
                  " milliseconds",
                );

                // if session is closed then remove its relation from its parent conversation
                const updateConversation = await Conversation.updateOne(
                  {
                    _id: (
                      recheckSession?.parentConversation as ConversationDocument
                    )._id,
                  },
                  { session: null },
                );

                if (await updateConversation) {
                  if (updateConversation.modifiedCount === 1) {
                    console.log("Session removed from conversation");
                  } else {
                    console.log("Could not update session parent conversation");
                  }
                }

                // start session deletion process
                await delete_session({ sessionId: sessionId });
              } else {
                throw Error(
                  "Could not update status for sesssion " + sessionId,
                );
              }
            } else {
              throw Error(
                "session " + recheckSession?._id + " is already closed",
              );
            }
            resolve(); // Resolve the Promise after the timeout
          }, session?.duration);
        });
      } else {
        throw Error(`No ongoing session found with ID ${sessionId}`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log("Exiting session closing process");
    const command = `pm2 delete scp-${sessionId}`;
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
    process.exit(0);
  }
}

export { close_session };
