import dotenv from "dotenv";
import mongoose from "mongoose";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error("MONGO_URI is required to migrate farm indexes.");
}

try {
  await mongoose.connect(mongoUri);
  const farms = mongoose.connection.collection("farms");
  let indexes;
  try {
    indexes = await farms.indexes();
  } catch (error) {
    if (error.code === 26 || error.codeName === "NamespaceNotFound") {
      console.log("The farms collection does not exist yet; no index migration is needed.");
      process.exitCode = 0;
    } else {
      throw error;
    }
  }

  if (indexes) {
    const legacyUniqueOwnerIndex = indexes.find((index) => (
      index.name === "owner_1"
      && index.unique === true
      && index.key?.owner === 1
      && Object.keys(index.key).length === 1
    ));

    if (legacyUniqueOwnerIndex) {
      await farms.dropIndex(legacyUniqueOwnerIndex.name);
      console.log("Removed the legacy unique owner index; farms can now be multi-document per farmer.");
    } else {
      console.log("No legacy unique owner index found; no changes were needed.");
    }
  }
} finally {
  await mongoose.disconnect();
}
