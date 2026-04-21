import "dotenv/config";
import {createServer} from "node:http";
import { createApp } from "./app";

async function main() {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    const server = createServer(createApp());

    server.listen(PORT, () => {
        console.log("Server is running on PORT" , PORT);
    });
    
  } catch (error) {
    console.log("error");
  }
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});

