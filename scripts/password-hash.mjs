import { scryptSync, randomBytes } from "node:crypto";
// Read from stdin to avoid exposing a password in shell history or process arguments.
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 12) throw new Error("Use at least 12 characters");
const salt = randomBytes(16).toString("hex");
console.log(`scrypt:${salt}:${scryptSync(password, salt, 32).toString("hex")}`);
