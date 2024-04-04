import { config } from "dotenv";
import { hasEmptyValues } from "../utils/functions.utils";

config({ path: `.env.${process.env.NODE_ENV}`, debug: true });

/**
 * @name RootConfig
 * @description root configuration type
 */
type RootConfig = {
  serverConfig: {
    port: number;
    host: string;
    allowedOrigins: Array<string>;
    allowedMethods: Array<string>;
  };
  authConfig: {
    jwtSecret: string;
    bcryptRounds: number;
  };
  databaseConfig: {
    uri: string;
    db: string;
    username: string;
    password: string;
  };
  mailerConfig: {
    // apiKey: string;
    from: string;
    // to: string;
    username: string;
    password: string;
    smtpHost: string;
    smtpPort: number;
  };
  firebaseConfig: {
    // credentialFilePath: any
    serverKey: string;
  };
  sessionConfig: {
    deletionInterval: number;
  };
};

/**
 * @name Config
 * @description root configuration type
 */
const Config: RootConfig = {
  serverConfig: {
    port: Number(process.env.PORT),
    host: process.env.HOST as string,
    allowedOrigins: (process.env.ALLOWED_ORIGINS as string).split(","),
    allowedMethods: (process.env.ALLOWED_METHODS as string).split(","),
  },
  authConfig: {
    jwtSecret: process.env.JWT_SECRET as string,
    bcryptRounds: Number(process.env.ROUNDS),
  },
  databaseConfig: {
    uri: process.env.DB_URI as string,
    db: process.env.DB_NAME as string,
    username: process.env.DB_USER as string,
    password: process.env.DB_PASS as string,
  },
  mailerConfig: {
    // apiKey: process.env.SENDGRID_API_KEY as string,
    from: process.env.SMTP_FROM as string,
    // to: process.env.SENDGRID_TO_ADDRESS as string,
    username: process.env.ETHEREAL_USERNAME as string,
    password: process.env.ETHEREAL_PASSWORD as string,
    smtpHost: process.env.SMTP_HOST as string,
    smtpPort: Number(process.env.SMTP_PORT),
  },
  firebaseConfig: {
    // credentialFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS
    serverKey: process.env.FIREBASE_PROJECT_SERVER_KEY as string,
  },
  sessionConfig: {
    deletionInterval: Number(process.env.SESSION_DELETION_TIME_INTERVAL),
  },
};

if (hasEmptyValues(Config)) {
  console.error("\n\nPLEASE ENSURE ALL ENVIRONMENT VARIABLES ARE SET\n\n");
  process.exit(1);
}

export { Config };
