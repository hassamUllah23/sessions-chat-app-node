import mongoose, { Types } from "mongoose";
import { Config } from "../services/config.service";
import { Session } from "../database/models/session.model";
import { hasEmptyValues } from "../utils/functions.utils";
import { SessionStatusEnum } from "../utils/enums.utils";
import { exec } from "child_process";

interface ModuleParams {
  sessionId: string;
}
async function delete_session({ sessionId }: ModuleParams) {
  console.log("Session deletion process initiated for session ", sessionId);
  try {
    if (hasEmptyValues({ sessionId })) {
      throw Error("Session ID cannot be empty");
    } else {
      const { databaseConfig, sessionConfig } = Config;
      await mongoose.connect(databaseConfig.uri, {
        dbName: databaseConfig.db, // Specify your desired database name
        auth: {
          username: databaseConfig.username,
          password: databaseConfig.password,
        },
      });

      const session = await Session.findOne({
        _id: new Types.ObjectId(sessionId),
        status: SessionStatusEnum.closed,
      }).populate("parentConversation");
      if (await session) {
        // if (session?.status === SessionStatusEnum.ongoing) {
        console.log(
          "going to delete session after ",
          sessionConfig.deletionInterval,
          " milliseconds",
        );
        await new Promise((resolve: any): void => {
          setTimeout(async () => {
            const recheckSession = await Session.findOne({
              _id: session?._id,
              status: SessionStatusEnum.closed,
            });
            if (await recheckSession) {
              const updateResult = await Session.deleteOne({
                _id: session?._id,
              });
              if (updateResult.deletedCount === 1) {
                console.log(
                  "Session ",
                  sessionId,
                  " deleted succesfully after",
                  sessionConfig.deletionInterval,
                  "milliseconds",
                );
              } else {
                throw Error(`Could not delete sesssion ${sessionId}`);
              }
            } else {
              throw Error(`Session ${sessionId} might already be deleted`);
            }
            resolve(); // Resolve the Promise after the timeout
          }, sessionConfig.deletionInterval);
        });
        // }
      } else {
        throw Error(`No closed session found with ID ${sessionId}`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    console.log("Exiting delete session process");
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

    process.exit(0);
  }
}

export { delete_session };
