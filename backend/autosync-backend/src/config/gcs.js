const { Storage } = require("@google-cloud/storage");
const path = require("path");

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEYFILE, // path to your service account JSON key
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

/**
 * Uploads a file buffer (from multer memoryStorage) to GCS.
 * Returns the public URL of the uploaded file.
 */
const uploadToGCS = (fileBuffer, originalName, mimetype) => {
  return new Promise((resolve, reject) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
    const blob = bucket.file(uniqueName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimetype,
    });

    blobStream.on("error", (err) => reject(err));

    blobStream.on("finish", () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(fileBuffer);
  });
};

/**
 * Deletes a file from GCS given its public URL.
 */
const deleteFromGCS = async (fileUrl) => {
  try {
    const fileName = fileUrl.split(`${bucket.name}/`)[1];

    if (!fileName) return;

    await bucket.file(fileName).delete();
  } catch (err) {
    console.error("GCS delete failed:", err.message);
  }
};

module.exports = { uploadToGCS, deleteFromGCS };