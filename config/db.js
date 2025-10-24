import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const ca_path = process.env.RENDER
  ? process.env.CA_PEM_PATH
  : path.join(process.cwd(), "ca.pem");

const connectionString = process.env.DATABASE_URL.split("?")[0];

const poolOptions = {
  uri: connectionString,
};

if (ca_path && fs.existsSync(ca_path)) {
  poolOptions.ssl = {
    ca: fs.readFileSync(ca_path),
  };
  console.log("SSL certificate loaded successfully.");
} else {
  console.warn(
    `CA certificate not found at path: ${ca_path}. SSL will not be used. This will likely cause a connection error if the database requires SSL.`
  );
}

const pool = mysql.createPool(poolOptions);

export const db = drizzle(pool);
