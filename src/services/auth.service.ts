import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { Config } from "../services/config.service";

async function encryptPassword(password: string): Promise<string> {
  console.log("Config.authConfig: ", Config.authConfig, password);
  return await bcrypt.hash(password, Config.authConfig.bcryptRounds);
}

async function decodeToken(token: string) {
  const decoded: any = jwt.decode(token);
  return decoded.data;
}

async function verifyPassword(
  password: string,
  encrypted: string,
): Promise<boolean> {
  return (await bcrypt.compare(password, encrypted)) ? true : false;
}

async function generateToken(data: object) {
  return jwt.sign({ data }, Config.authConfig.jwtSecret, {
    expiresIn: "1d",
  });
}

function generateRandomPassword(length: number = 8): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export {
  generateToken,
  decodeToken,
  encryptPassword,
  verifyPassword,
  generateRandomPassword,
};
