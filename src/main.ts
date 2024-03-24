import express, { Request, Response } from "express";
import dotenv from "dotenv";
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
import { hasEmptyValues } from "./utils/functions.utils";

dotenv.config();

async function run_server() {
  const { authConfig, databaseConfig, serverConfig } = Config;
  console.log("Server starting...");
  await mongoose.connect("mongodb://mongo:mongo@localhost:27017", {
    dbName: "sessions-chat-app", // Specify your desired database name
    auth: {
      username: "mongo",
      password: "mongo",
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
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/auth/login", (req, res) => {
    const postData = req.query; // Parse the JSON data
    const data = {
      username: postData.username as string,
      password: postData.password as string,
    };
    User.findOne({ username: data.username }).then(async (user) => {
      if (user) {
        if (await verifyPassword(data.password, user.password)) {
          generateToken({ id: user.id }).then((token) => {
            res.send({ token: token, userId: user.id });
          });
        } else {
          res.status(400).send("Incorrect Password");
        }
      } else {
        res.status(400).send("Unidentified Username");
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

  app.patch("/users/update", (req: Request, res: Response) => {
    User.updateOne({ _id: req.body.userId }, { ...req.body }).then((result) => {
      if (result.matchedCount === 1 && result.modifiedCount === 1) {
        res.status(200).send("User updated succesfully");
      } else if (result.matchedCount === 0) {
        res.status(400).send("User not found");
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

  app.listen(Number(serverConfig.port), serverConfig.host, () => {
    console.log(
      `[server]: Server is running at http://${serverConfig.host}:${serverConfig.port}`,
    );
  });

  // //////////////////// USERS MODULE END ////////////////////
}

run_server();
