import { randomBytes } from "crypto";

const key = randomBytes(32).toString("base64");
console.log("TOKEN_ENCRYPTION_KEY=" + key);
