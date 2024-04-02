import express, { Request, Response } from "express";
import dotenv from "dotenv";
// import { createServer } from "https"
// import { readFileSync } from "fs"
import bodyParser from "body-parser";
import { Config } from "./services/config.service";
import {
  encryptPassword,
  generateRandomPassword,
  generateToken,
  verifyPassword,
} from "./services/auth.service";
import mongoose from "mongoose";
import { User, UserDocument } from "./database/models/user.model";
import { MailService } from "./services/mail.service";
import {
  extractOtherParticipants,
  hasEmptyValues,
} from "./utils/functions.utils";
import {
  Conversation,
  ConversationDocument,
} from "./database/models/conversation.model";
import { ParticipantDocument } from "./database/models/participant.model";
import { Server } from "socket.io";
import { MessageDocument } from "./database/models/message.model";
import { Invite } from "./database/models/invite.model";
import { InviteStatusEnum, SessionStatusEnum } from "./utils/enums.utils";
import { Session, SessionDocument } from "./database/models/session.model";
import { FirebaseService } from "./services/firebase.service";
import cors from "cors"
dotenv.config();

async function run_server() {
  const { authConfig, databaseConfig, serverConfig } = Config;
  console.log("Server starting...");
  await mongoose.connect(databaseConfig.uri, {
    dbName: databaseConfig.db, // Specify your desired database name
    auth: {
      username: databaseConfig.username,
      password: databaseConfig.password,
    },
  });
  // await mongoose.connect(databaseConfig.uri, {
  //   dbName: databaseConfig.db, // Specify your desired database name
  // });

  const app = express();

  console.log("Setting up headers...");

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    const origin = String(req.headers.origin);
    // if (CORS_ALLOWED.includes(origin)) {
    //   res.setHeader("Access-Control-Allow-Origin", origin);
    // }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
  });

  console.log("Setting up apis...");
  app.use(cors())

  app.post("/auth/register", async (req, res) => {
    const postData = req.body; // Parse the JSON data
    try {
      const data: UserDocument = {
        username: postData.username,
        password: await encryptPassword(postData.password),
        email: postData.email,
        name: postData.name,
      };
      const user = new User(data);
      user.save();
      res.status(200).send("User created Succesfully");
      return;
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.get("/", (req, res) => {
    res.status(200).send("Hello from Convo Square Server");
    return
  });
  app.get("/auth/login", (req, res) => {
    const postData = req.query; // Parse the JSON data
    const data = {
      username: postData.username as string,
      password: postData.password as string,
    };
    User.findOne({ username: data.username })
      // .populate(["contacts", "blockList"])
      .then(async (user) => {
        if (user) {
          if (await verifyPassword(data.password, user.password)) {
            generateToken({ id: user.id }).then((token) => {
              res.send({ token: token, userId: user.id, user: user });
              return;
            });
          } else {
            res.status(400).send("Incorrect Password");
            return;
          }
        } else {
          res.status(400).send("Unidentified Username");
          return;
        }
      });
  });

  app.patch("/auth/change-password", (req, res) => {
    const postData = req.body; // Parse the JSON data
    console.log({ postData });
    const data = {
      id: postData.userId,
      oldPassword: postData.oldPassword,
      newPassword: postData.newPassword,
    };
    User.findOne({ _id: data.id }).then(async (user) => {
      if (user) {
        if (await verifyPassword(data.oldPassword, user.password)) {
          User.updateOne(
            { _id: user.id },
            { password: await encryptPassword(data.newPassword) },
          ).then((result) => {
            if (result.modifiedCount === 1) {
              res.status(200).send("Password changed succesfully");
            } else {
              res.status(500).send("Failed to update Password");
            }
          });
        } else {
          res.status(400).send("Incorrect Old Password");
        }
      } else {
        res.status(400).send("Unidentified Username");
      }
    });
  });

  app.patch("/auth/forgot-password", (req, res) => {
    const postData = req.body; // Parse the JSON data
    let data: {
      email: string | undefined;
      to_name: string | undefined;
      new_password: string | undefined;
    } = {
      email: postData.email,
      to_name: undefined,
      new_password: undefined,
    };

    User.findOne({ email: data.email }).then(async (user) => {
      if (user) {
        const generatedPassword = generateRandomPassword(8);
        User.updateOne(
          { email: data.email },
          { password: await encryptPassword(generatedPassword) },
        ).then(async (result) => {
          if (result.modifiedCount === 1) {
            data = {
              ...data,
              to_name: user.name,
              new_password: generatedPassword,
            };
            if (hasEmptyValues(data)) {
              console.error("missing required fields: ", { ...data });
              return res.status(400).send("Missing required fields");
            }
            try {
              MailService.sendEmailJsMail({
                to_name: data.to_name!!,
                new_password: data.new_password!!,
              });
              res.status(200).send("Temporary Password sent to your email");
            } catch (error) {
              res.status(500).send("Failed to send email");
            }
          } else {
            res.status(500).send("Failed to update Password");
          }
        });
      } else {
        res.status(400).send("Unidentified User");
      }
    });
  });
  //////////////////// USERS MODULE START ////////////////////

  app.get("/users/list", (req: Request, res: Response) => {
    User.find({}).then((users) => {
      res.send(users);
    });
  });

  app.get("/users/get", (req: Request, res: Response) => {
    User.findOne({ _id: req.query.userId })
      .populate(["contacts", "blockList"])
      .then((user) => {
        res.send(user);
        return;
      })
      .catch((error) => {
        res.status(400).send("User not found");
      });
  });

  app.get("/users/get/username", (req: Request, res: Response) => {
    const data: {
      searcherId: string;
      username: string;
    } = {
      searcherId: req.query.searcherId as string,
      username: req.query.username as string,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }

    User.findOne({ _id: data.searcherId })
      .populate(["blockList"])
      .then((searcher) => {
        if (searcher) {
          if (
            searcher.blockList?.find(
              (blockedUser) =>
                (blockedUser as UserDocument).username === data.username,
            )
          ) {
            res.status(400).send("User is blocked by you");
            return;
          } else {
            User.findOne({ username: req.query.username })
              // .populate(["contacts", "blockList"])
              .then((user) => {
                console.log({ user });
                if (user) {
                  res.status(200).send(user);
                  return;
                } else {
                  res.status(400).send("User not found");
                  return;
                }
              })
              .catch((error) => {
                res.status(500).send("Internal server error");
                return;
              });
          }
        } else {
          res.status(400).send("User not found");
          return;
        }
      });
  });

  app.patch("/users/add-contact", (req: Request, res: Response) => {
    const data: { currentId: string; id: string } = {
      currentId: req.body.currentId,
      id: req.body.id,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.currentId })
      // .populate(["contacts", "blockList"])
      .then((user) => {
        console.log({ user });
        if (user) {
          User.findOne({ _id: data.id })
            // .populate(["contacts", "blockList"])
            .then((userToAdd) => {
              if (userToAdd) {
                const foundContact = user?.contacts?.find(
                  (contact) => contact.toString() === userToAdd._id.toString(),
                );
                if (foundContact) {
                  res.status(400).send("Contact already added");
                  return;
                } else {
                  User.updateOne(
                    { _id: data.currentId },
                    { $push: { contacts: userToAdd._id } },
                  ).then((result) => {
                    if (result.modifiedCount === 1) {
                      const members: Array<ParticipantDocument> = [
                        { user: data.currentId },
                        { user: data.id },
                      ];
                      const conversation = new Conversation({
                        participants: [...members],
                      });
                      conversation
                        .save()
                        .then((result) => {
                          res
                            .status(200)
                            .send("Conversation created succesfully");
                          return;
                        })
                        .catch((error) => {
                          console.log(error);
                          res.status(500).send("Internal server error");
                          return;
                        });
                    } else {
                      res.status(400).send("Failed to add contact");
                      return;
                    }
                    return;
                  });
                }
              } else {
                res.status(404).send("Invalid user ID");
                return;
              }
            })
            .catch((error) => {
              res.status(404).send("Invalid  user ID");
              return;
            });
        } else {
          res.status(404).send("Invalid current user ID");
          return;
        }
      })
      .catch((error) => {
        res.status(404).send("Invalid current user ID");
        return;
      });
    return;
  });

  app.patch("/users/remove-contact", (req: Request, res: Response) => {
    const data: { currentId: string; id: string } = {
      currentId: req.body.currentId,
      id: req.body.id,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.currentId })
      .then((user) => {
        console.log({ user });
        if (user) {
          User.findOne({ _id: data.id })
            .then((userToAdd) => {
              if (userToAdd) {
                User.updateOne(
                  { _id: data.currentId },
                  { $pull: { contacts: userToAdd._id } },
                ).then((result) => {
                  result.modifiedCount === 1
                    ? res.status(200).send("Contact removed succesfully")
                    : res.status(400).send("Failed to remove contact");
                });
              } else {
                res.status(404).send("Invalid user ID");
                return;
              }
            })
            .catch((error) => {
              res.status(404).send("Invalid  user ID");
              return;
            });
        } else {
          res.status(404).send("Invalid current user ID");
          return;
        }
      })
      .catch((error) => {
        res.status(404).send("Invalid current user ID");
        return;
      });
    return;
  });
  app.patch("/users/block", (req: Request, res: Response) => {
    const data: { currentId: string; id: string } = {
      currentId: req.body.currentId,
      id: req.body.id,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.currentId })
      .then((user) => {
        if (user) {
          // check if the user to block already exists in the blockList
          if (
            user.blockList?.find(
              (blockedUser) => blockedUser.toString() === data.id.toString(),
            )
          ) {
            res.status(400).send("User already blocked");
            return;
          } else {
            User.findOne({ _id: data.id })
              .then((userToBlock) => {
                if (userToBlock) {
                  User.findOneAndUpdate(
                    { _id: data.currentId },
                    { $push: { blockList: userToBlock._id } },
                    { new: true },
                  )
                    .populate(["blockList"])
                    .then((result) => {
                      result
                        ? res.status(200).send(result)
                        : res.status(400).send("Failed to block user");
                      return;
                    });
                  User.updateOne(
                    { _id: data.currentId },
                    { $pull: { contacts: userToBlock._id } },
                  ).then((result) => {
                    result.modifiedCount === 1
                      ? console.log("Contact removed succesfully")
                      : console.log("Failed to remove contact");
                  });
                } else {
                  res.status(404).send("Invalid user ID");
                  return;
                }
              })
              .catch((error) => {
                res.status(404).send("Invalid user ID");
                return;
              });
          }
        } else {
          res.status(404).send("Invalid current user ID");
          return;
        }
      })
      .catch((error) => {
        res.status(404).send("Invalid current user ID");
        return;
      });
    return;
  });

  app.patch("/users/unblock", (req: Request, res: Response) => {
    const data: { currentId: string; id: string } = {
      currentId: req.body.currentId,
      id: req.body.id,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.currentId })
      .then((user) => {
        if (user) {
          // check if the user to block already exists in the blockList
          if (
            user.blockList?.find(
              (blockedUser) => blockedUser.toString() === data.id.toString(),
            ) === undefined
          ) {
            res.status(400).send("User not in blocklist");
            return;
          } else {
            User.findOne({ _id: data.id })
              .then((userToUnblock) => {
                if (userToUnblock) {
                  User.updateOne(
                    { _id: data.currentId },
                    { $pull: { blockList: data.id } },
                  )
                    .then((result) => {
                      result.modifiedCount === 1
                        ? res.status(200).send("User unblocked succesfully")
                        : res.status(400).send("Failed to unblock user");
                      return;
                    })
                    .catch((error) => {
                      console.error(error);
                      console.error("failed to update blocklist");
                      res.status(500).send("Something went wrong");
                    });
                } else {
                  res.status(404).send("Invalid user ID");
                  return;
                }
              })
              .catch((error) => {
                res.status(404).send("Invalid  user ID");
                return;
              });
          }
        } else {
          res.status(404).send("Invalid current user ID");
          return;
        }
      })
      .catch((error) => {
        res.status(404).send("Invalid current user ID");
        return;
      });
    return;
  });

  app.patch("/users/update", (req: Request, res: Response) => {
    try {
      User.findOneAndUpdate(
        { _id: req.body.userId },
        { ...req.body },
        { new: true },
      ).then((result) => {
        if (result) {
          res.status(200).send("User updated succesfully");
        } else {
          res.status(400).send("User not found");
          return;
        }
      });
    } catch (error) {
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.patch("/users/fcm", (req: Request, res: Response) => {
    const data: { userId: string; fcmToken: string } = {
      userId: req.body.userId,
      fcmToken: req.body.fcmToken,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.userId }).then((user) => {
      if (user) {
        user.firebaseToken = data.fcmToken;
        user.save().then((result) => {
          if (result) {
            res.status(200).send("Firebase token updated succesfully");
            return;
          } else {
            res.status(400).send("Failed to update firebase token");
            return;
          }
        });
      } else {
        res.status(400).send("User not found");
        return;
      }
    });
  });

  app.patch("/users/toggle-notifications", (req: Request, res: Response) => {
    const data: { userId: string; notifications: boolean } = {
      userId: req.body.userId,
      notifications: req.body.notifications,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.userId }).then((user) => {
      if (user) {
        user.settings = {
          theme: user.settings?.theme as "dark" | "light",
          notifications: data.notifications,
        };
        user.save().then((result) => {
          if (result) {
            res.status(200).send("Notifications toggled succesfully");
            return;
          } else {
            res.status(400).send("Failed to toggle notifications");
            return;
          }
        });
      } else {
        res.status(400).send("User not found");
        return;
      }
    });
  });

  app.patch("/users/toggle-theme", (req: Request, res: Response) => {
    const data: { userId: string; theme: string } = {
      userId: req.body.userId,
      theme: req.body.theme,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    User.findOne({ _id: data.userId }).then((user) => {
      if (user) {
        user.settings = {
          theme: data.theme as "dark" | "light",
          notifications: user.settings?.notifications as boolean,
        };
        user.save().then((result) => {
          if (result) {
            res.status(200).send("Theme toggled succesfully");
            return;
          } else {
            res.status(400).send("Failed to toggle theme");
            return;
          }
        });
      } else {
        res.status(400).send("User not found");
        return;
      }
    });
  });

  app.delete("/users/delete", (req: Request, res: Response) => {
    User.deleteOne({ _id: req.query.id }, { ...req.body }).then((result) => {
      if (result.deletedCount === 1) {
        res.status(200).send("User deleted succesfully");
      } else {
        res.status(400).send("Failed to delete user");
      }
    });
  });

  // //////////////////// USERS MODULE END ////////////////////

  // //////////////////// INVITES MODULE START ////////////////////

  app.post("/invites/create", async (req, res) => {
    try {
      let data: {
        adminId: string;
        inviteeId: string;
        conversationId: string;
      } = {
        adminId: req.body.adminId as string,
        inviteeId: req.body.inviteeId as string,
        conversationId: req.body.conversationId as string,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      try {
        const foundConversation = await Conversation.findOne({
          _id: data.conversationId,
        });
        if (foundConversation) {
          const foundInvitee = await User.findOne({ _id: data.inviteeId });
          if (foundInvitee) {
            const conversation = await Conversation.findOne({
              _id: data.conversationId,
            });
            if (conversation) {
              console.log({ participants: conversation.participants });
              const admins = conversation.participants.filter(
                (participant) =>
                  participant.role === "admin" &&
                  participant.user.toString() === data.adminId,
              );
              console.log({ admins });
              if (admins.length === 1) {
                const foundInvite = await Invite.findOne({
                  inviteeId: data.inviteeId,
                  conversationId: data.conversationId,
                  status: InviteStatusEnum.pending,
                });
                if (foundInvite) {
                  res.status(400).send("Invite already sent");
                  return;
                } else {
                  const invite = new Invite({
                    adminId: data.adminId,
                    inviteeId: data.inviteeId,
                    conversationId: data.conversationId,
                  });
                  invite.save();
                  res.status(200).send("Invite sent succesfully");
                  return;
                }
              } else {
                res.status(400).send("You are not the admin of this group");
                return;
              }
            } else {
              res.status(400).send("Conversation does not exist");
              return;
            }
          } else {
            res.status(400).send("Invitee does not exist");
            return;
          }
        } else {
          res.status(400).send("Conversation does not exist");
          return;
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
        return;
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.get("/invites/list/conversation", (req: Request, res: Response) => {
    const data: { conversationId: string } = {
      conversationId: req.query.conversationId as string,
      // populate: req.query.populate as boolean
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    console.log({ data });
    Invite.find({ conversationId: data.conversationId })
      .populate("inviteeId")
      .then((invites) => {
        res.send(invites);
        return;
      });
  });

  app.get("/invites/list/user", (req: Request, res: Response) => {
    const data: { userId: string } = {
      userId: req.query.userId as string,
      // populate: req.query.populate as boolean
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    console.log({ data });
    Invite.find({ inviteeId: data.userId, status: InviteStatusEnum.pending })
      .populate(["adminId", "conversationId"])
      .then((invites) => {
        res.send(invites);
        return;
      });
  });

  app.patch("/invites/accept", (req: Request, res: Response) => {
    const data: { inviteId: string; inviteeId: string } = {
      inviteId: req.body.inviteId,
      inviteeId: req.body.inviteeId,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    Invite.findByIdAndUpdate(
      { _id: data.inviteId, inviteeId: data.inviteeId },
      {
        status: InviteStatusEnum.accepted,
      },
      {
        new: true,
      },
    )
      .then((result) => {
        if (result) {
          if (result.status === InviteStatusEnum.accepted) {
            Conversation.findOneAndUpdate(
              { _id: result.conversationId },
              {
                $push: {
                  participants: { role: "member", user: data.inviteeId },
                },
              },
              {
                new: true,
              },
            )
              .then((result) => {
                if (result) {
                  res.status(200).send(result);
                  return;
                } else {
                  res.status(400).send(null);
                  return;
                }
              })
              .catch((error) => {
                console.error(error);
                res.status(500).send("Internal server error");
                return;
              });
          } else {
            res.status(400).send("Failed to accept invite");
            return;
          }
        } else {
          res.status(400).send(null);
          return;
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal server error");
        return;
      });
  });

  app.patch("/invites/reject", (req: Request, res: Response) => {
    const data: { inviteId: string; inviteeId: string } = {
      inviteId: req.body.inviteId,
      inviteeId: req.body.inviteeId,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    Invite.findOneAndUpdate(
      { _id: data.inviteId, inviteeId: data.inviteeId },
      {
        status: InviteStatusEnum.rejected,
      },
      {
        new: true,
      },
    )
      .then((result) => {
        if (result) {
          res.status(200).send(result);
          return;
        } else {
          res.status(400).send(null);
          return;
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal server error");
        return;
      });
  });

  // //////////////////// INVITES MODULE END ////////////////////

  // //////////////////// SESSIONS MODULE START ////////////////////

  app.post("/sessions/create", async (req, res) => {
    // required for one-to-one conversation: participants
    // required for group conversation: participants, name, group
    const postData = req.body; // Parse the JSON data
    try {
      const data: {
        adminId: string;
        memberIds: string[];
        parentConversationId: string;
        duration: number;
      } = {
        adminId: postData.adminId,
        parentConversationId: postData.parentConversationId,
        memberIds: postData.memberIds,
        duration: postData.duration,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }

      const foundParentConversation = await Conversation.findOne({
        _id: data.parentConversationId,
      });
      if (foundParentConversation) {
        const ongoingSession: SessionDocument | null = await Session.findOne({
          parentConversation: data.parentConversationId,
        });
        if (ongoingSession === null) {
          let newSession = new Session({
            status: SessionStatusEnum.ongoing,
            duration: data.duration,
            parentConversation: data.parentConversationId,
          });
          // console.log({ session: newSession })
          const members: Array<ParticipantDocument> = data.memberIds.map(
            (memberId): ParticipantDocument => {
              return { user: memberId };
            },
          );
          const conversation = new Conversation({
            participants: [...members, { user: data.adminId, role: "admin" }],
            name: foundParentConversation.name,
            session: newSession._id,
            isGroup: true,
            isSession: true,
          });
          conversation
            .save()
            .then(async (newSavedConversation) => {
              const result = await Conversation.findOneAndUpdate(
                { _id: data.parentConversationId },
                { session: newSession._id },
                { new: true },
              );
              // console.log({ result })
              if (result) {
                newSession.parentConversation = data.parentConversationId;
                newSession.conversation = newSavedConversation._id;
                newSession.save().then(async (newSavedSession) => {
                  if (newSavedSession) {
                    //start a timer here
                    const populatedSession = await Session.findOne({
                      _id: newSavedSession._id,
                    }).populate([
                      "parentConversation",
                      "conversation",
                      "conversation.participants.user",
                    ]);
                    res.status(200).send(populatedSession);
                    setTimeout(() => {
                      Session.updateOne(
                        { _id: newSavedSession._id },
                        { status: SessionStatusEnum.closed },
                      ).then((result) => {
                        if (result.modifiedCount === 1) {
                          console.log("Session stopped");
                        } else {
                          console.log("Failed to stop session");
                        }
                      });
                    }, data.duration);
                    return;
                  } else {
                    Conversation.deleteOne({ _id: newSavedConversation });
                    res.status(500).send("Failed to start session");
                    return;
                  }
                });
              } else {
                res.status(500).send("Failed to start session");
                return;
              }
            })
            .catch((error) => {
              console.log(error);
              res.status(500).send("Internal server error");
              return;
            });
        } else {
          res
            .status(400)
            .send("An ongoing session already exists for this conversation");
          return;
        }
      } else {
        res.status(400).send("Parent conversation does not exist");
        return;
      }
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/sessions/list", async (req: Request, res: Response) => {
    const data: { userId: string } = {
      userId: req.query.userId as string,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }

    let response: Array<SessionDocument> = [];

    let onGoingSessions = await Session.find({
      status: SessionStatusEnum.ongoing,
    })
      // .populate(["parentConversation"])
      .populate({
        path: "parentConversation",
        populate: {
          path: "participants.user",
        },
      })
      .populate({
        path: "conversation",
        populate: {
          path: "participants.user",
        },
      });
    // console.log(onGoingSessions[0].conversation)
    // .populate({
    //   path: 'conversation',
    //   match: { "participants.user": data.userId } // filter based on specific fields of the second schema
    // })
    onGoingSessions = onGoingSessions.filter((session) =>
      (session.conversation as ConversationDocument).participants
        .map((p) => (p.user as UserDocument)?._id?.toString())
        .includes(data.userId),
    );
    onGoingSessions = onGoingSessions.filter(
      (session) => session.conversation !== null,
    );

    let closedSessions = await Session.find({
      status: SessionStatusEnum.closed,
    })
      .populate({
        path: "parentConversation",
      })
      .populate({
        path: "conversation",
        match: { "participants.role": "admin" }, // filter based on specific fields of the second schema
      });
    closedSessions = closedSessions.filter(
      (session) => session.conversation !== null,
    );

    res.send([...onGoingSessions, ...closedSessions]);
    return;
  });

  app.patch("/sessions/stop", async (req: Request, res: Response) => {
    const data: { adminId: string; sessionId: string } = {
      adminId: req.body.adminId,
      sessionId: req.body.sessionId,
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    let foundSession = await Session.findOne({
      _id: data.sessionId,
      status: SessionStatusEnum.ongoing,
    }).populate("conversation");
    if (foundSession) {
      const foundAdmin: ParticipantDocument | undefined = (
        foundSession.conversation as ConversationDocument
      ).participants.find(
        (p) => p.role === "admin" && p.user.toString() === data.adminId,
      );
      if (foundAdmin) {
        // Conversation.updateOne({ _id: (foundSession.conversation as ConversationDocument)._id }, { session: null }).then((result) => {
        //   if (result.modifiedCount === 1) {
        Conversation.updateOne(
          {
            _id: (foundSession.parentConversation as ConversationDocument)._id,
          },
          { session: null },
        ).then((result) => {
          if (result.modifiedCount === 1) {
            console.log("Session removed from conversation");
            foundSession.status = SessionStatusEnum.closed;
            foundSession.save().then((result) => {
              res.status(200).send("Session stopped");
              return;
            });
          } else {
            res
              .status(400)
              .send("Could not update session parent conversation");
            return;
          }
        });
        // } else {
        //   res.status(400).send("Could not update session conversation");
        //   return;
        // }
        // })
      } else {
        res.status(400).send("You are not the admin of this session");
        return;
      }
    } else {
      res.status(400).send("No such Ongoing Session found");
      return;
    }
  });

  // //////////////////// SESSIONS MODULE END ////////////////////

  // //////////////////// CONVERSATIONS MODULE START ////////////////////
  app.post("/conversations/create", async (req, res) => {
    // required for one-to-one conversation: participants
    // required for group conversation: participants, name, group
    const postData = req.body; // Parse the JSON data
    try {
      const data: { currentId: string; userId: string } = {
        currentId: postData.currentId,
        userId: postData.userId,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      const members: Array<ParticipantDocument> = [
        { user: data.currentId },
        { user: data.userId },
      ];
      const conversation = new Conversation({
        participants: [...members],
      });
      conversation
        .save()
        .then((result) => {
          return res.status(200).send("Conversation created succesfully");
        })
        .catch((error) => {
          console.log(error);
          return res.status(500).send("Internal server error");
        });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/conversations/create/group", async (req, res) => {
    // required for one-to-one conversation: adminId, memberIds, name
    const postData = req.body; // Parse the JSON data
    try {
      const data: { adminId: string; memberIds: string[]; name: string } = {
        adminId: postData.adminId,
        memberIds: postData.memberIds,
        name: postData.name,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      const members: Array<ParticipantDocument> = data.memberIds.map(
        (memberId): ParticipantDocument => {
          return { user: memberId };
        },
      );
      const conversation = new Conversation({
        participants: [...members, { user: data.adminId, role: "admin" }],
        name: data.name,
        isGroup: true,
      });
      conversation
        .save()
        .then((result) => {
          res.status(200).send("Group created succesfully");
          return;
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send("Internal server error");
          return;
        });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.patch("/conversations/send", async (req, res) => {
    // required for one-to-one conversation: adminId, memberIds, name
    const postData = req.body; // Parse the JSON data
    try {
      let data: {
        conversationId: string;
        senderId: string;
      } = {
        conversationId: postData.conversationId,
        senderId: postData.senderId,
      };
      if (
        hasEmptyValues({
          text: postData.text,
        }) &&
        hasEmptyValues({ attachment: postData.attachment })
      ) {
        res.status(400).send("Either text or attachment is required");
        return;
      }
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }

      User.findOne({ _id: data.senderId }).then((sender) => {
        if (sender) {
          Conversation.findOne({ _id: data.conversationId })
            .populate("session")
            .populate({
              path: "participants.user",
              // populate: {
              //   path: 'blockList'
              // }
            })
            .then((conversation) => {
              // if it is a one-to-one conversation
              if (!conversation?.isGroup) {
                // check if the sender has already been blocked by the recipient
                const otherParticipant = conversation?.participants.find(
                  (p) =>
                    (p.user as UserDocument)._id?.toString() !== data.senderId,
                );
                if (otherParticipant) {
                  if (
                    (otherParticipant.user as UserDocument).blockList
                      ?.map((b) => b.toString())
                      .includes(data.senderId)
                  ) {
                    res
                      .status(400)
                      .send("You have been blocked by the recipient");
                    return;
                  }
                }

                // check if the sender has already blocked the recipient

                const otherParticipantStr = conversation?.participants
                  .map((p) => (p.user as UserDocument)._id?.toString())
                  .find((p) => p !== data.senderId);
                if (otherParticipantStr) {
                  if (
                    sender.blockList
                      ?.map((b) => b.toString())
                      .includes(otherParticipantStr)
                  ) {
                    res
                      .status(400)
                      .send("You cannot send a message to a blocked user");
                    return;
                  }
                }
              }
              if (
                conversation?.isSession &&
                (conversation.session as SessionDocument).status ===
                SessionStatusEnum.closed
              ) {
                res
                  .status(400)
                  .send(
                    "Session is closed, you cannot send a message to a closed session",
                  );
                return;
              } else {
                Conversation.findOneAndUpdate(
                  { _id: data.conversationId },
                  {
                    $push: {
                      messages: {
                        conversation: data.conversationId,
                        sender: data.senderId,
                        text: postData.text,
                        attachment: postData.attachment,
                      },
                    },
                  },
                  {
                    new: true,
                  },
                )
                  .populate(["participants.user"])
                  .then(async (result) => {
                    if (result) {
                      res
                        .status(200)
                        .send(result.messages[result.messages.length - 1]);
                      if (sender.firebaseToken) {
                        console.log("sending firebase notification");
                        // FirebaseService.sendNotification({ fcmToken: sender.firebaseToken as string })
                        const recipients = extractOtherParticipants({
                          conversation: conversation as ConversationDocument,
                          senderId: data.senderId,
                        });
                        recipients.forEach(async (recipient) => {
                          if (
                            (recipient.user as UserDocument).settings
                              ?.notifications
                          ) {
                            await FirebaseService.sendFcmNotif(
                              (recipient.user as UserDocument)
                                .firebaseToken as string,
                            );
                          }
                        });
                      } else {
                        console.log("No firebase token found");
                      }
                      return;
                    } else {
                      res.status(400).send(null);
                      return;
                    }
                  })
                  .catch((error) => {
                    console.error(error);
                    res.status(500).send("Internal server error");
                    return;
                  });
              }
            });
        } else {
          res.status(400).send("Sender not found");
          return;
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.patch("/conversations/edit", async (req, res) => {
    // required for one-to-one conversation: adminId, memberIds, name
    try {
      let data: {
        conversationId: string;
        messageId: string;
        senderId: string;
        text: string;
      } = {
        conversationId: req.body.conversationId,
        messageId: req.body.messageId,
        senderId: req.body.senderId,
        text: req.body.text,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      Conversation.findOneAndUpdate(
        {
          _id: data.conversationId,
          messages: {
            $elemMatch: {
              _id: data.messageId,
              sender: data.senderId,
            },
          },
        },
        {
          $set: {
            "messages.$.text": data.text,
          },
        },
        {
          new: true,
        },
      )
        .then((result) => {
          if (result) {
            res.status(200).send(result);
            return;
          } else {
            res.status(400).send("Record not found");
            return;
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Internal server error");
          return;
        });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.patch("/conversations/update-participants", async (req, res) => {
    const postData = req.body; // Parse the JSON data
    try {
      let data: {
        conversationId: string;
        participants: Array<ParticipantDocument>;
      } = {
        conversationId: postData.conversationId,
        participants: postData.participants,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      Conversation.findOneAndUpdate(
        { _id: data.conversationId },
        {
          participants: data.participants,
        },
        {
          new: true,
        },
      )
        .then((result) => {
          if (result) {
            res.status(200).send(result);
            return;
          } else {
            res.status(400).send(null);
            return;
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Internal server error");
          return;
        });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.patch("/conversations/leave", async (req, res) => {
    const postData = req.body; // Parse the JSON data
    try {
      let data: {
        conversationId: string;
        userId: string;
      } = {
        conversationId: postData.conversationId,
        userId: postData.userId,
      };
      if (hasEmptyValues(data)) {
        res.status(400).send("Missing required fields");
        return;
      }
      Conversation.findOneAndUpdate(
        { _id: data.conversationId },
        {
          $pull: {
            participants: { user: data.userId },
          },
        },
        {
          new: true,
        },
      )
        .then((result) => {
          if (result) {
            res.status(200).send(result);
            return;
          } else {
            res.status(400).send(null);
            return;
          }
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Internal server error");
          return;
        });
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
      return;
    }
  });

  app.get("/conversations/list", (req: Request, res: Response) => {
    const data: { userId: string } = {
      userId: req.query.userId as string,
      // populate: req.query.populate as string
    };
    if (hasEmptyValues(data)) {
      res.status(400).send("Missing required fields");
      return;
    }
    Conversation.find({ "participants.user": data.userId, isSession: false })
      .populate(["participants.user", "session"])
      .then((conversations) => {
        res.send(conversations);
        return;
      });
  });

  app.get("/conversations/get", (req: Request, res: Response) => {
    Conversation.findOne({ _id: req.query.userId, isSession: false })
      .populate(["contacts", "blockList"])
      .then((user) => {
        res.send(user);
        return;
      })
      .catch((error) => {
        res.status(400).send("User not found");
        return;
      });
  });

  // const server = https.createServer({
  //   key: fs.readFileSync('server.key'),
  //   cert: fs.readFileSync('server.crt')
  // }, app).listen(Number(serverConfig.port), serverConfig.host, () => {
  //   console.log(
  //     `[server]: Server is running at https://${serverConfig.host}:${serverConfig.port}`,
  //   );
  // });
  const server = app.listen(
    Number(serverConfig.port),
    serverConfig.host,
    () => {
      console.log(
        `[server]: Server is running at http://${serverConfig.host}:${serverConfig.port}`,
      );
    },
  );

  const io = new Server(server, {
    // pingTimeout: 360000,
    cors: {
      origin: "*",
    },
  });
  // const httpsServer = createServer({
  //   key: readFileSync("server.key"),
  //   cert: readFileSync("server.crt")
  // }, app);

  // const io = new Server(httpsServer, {
  //   // cors: {
  //   //   origin: "*",
  //   //   allowedHeaders: "*",
  //   //   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  //   // },
  // });

  io.on("connection", (socket) => {
    console.warn(`${socket.id} : connected from frontend`);
    socket.on("setup", (userId: string) => {
      console.log("setting up");
      socket.join(userId);
      if (socket.rooms.has(userId)) {
        console.log(`${userId} : user joined room ${userId}`);
      }
      socket.emit("connected");
    });

    socket.on("join chat", (room) => {
      console.log("room name received: ", room);
      socket.join(room);
      if (socket.rooms.has(room)) {
        console.log(`User joined chat: ${room}`);
      }
      const roomClients = io.sockets.adapter.rooms.get(room);
      console.log("room clients: ", roomClients);
    });
    socket.on("disconnect", () => {
      console.warn(`${socket.id} : disconnected from frontend`);
    });

    socket.on(
      "new message",
      (participants: Array<string>, message: MessageDocument) => {
        console.log(
          `inside "new message" socket event: `,
          message,
          // participants,
        );
        participants.forEach((participant) => {
          // console.log({ participant, sender: message.sender });
          if (participant === message.sender) {
            // console.log("skipping sender");
            // return
          } else {
            // console.log(`sending message to ${participant}...`);
            console.log("sending socket event to: ", participant);
            socket.in(participant).emit("message received", message);
          }
        });
      },
    );
  });

  // httpsServer.listen(Number(serverConfig.port), serverConfig.host, () => {
  //   console.log(
  //     `[server]: Server is running at https://${serverConfig.host}:${serverConfig.port}`,
  //   );
  // });
}

run_server();
