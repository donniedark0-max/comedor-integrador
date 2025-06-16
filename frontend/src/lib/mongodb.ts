import { MongoClient } from "mongodb";

if (!process.env.MONGO_URI) {
  throw new Error("Falta definir MONGO_URI en las variables de entorno.");
}

const uri: string = process.env.MONGO_URI;
const options = {};

let client = new MongoClient(uri, options);
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // En desarrollo, utilizar una variable global para preservar la conexión
  if (!(global as any)._mongoClientPromise) {
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  clientPromise = client.connect();
}

export default clientPromise;