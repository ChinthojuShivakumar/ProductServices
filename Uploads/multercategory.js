import multer from "multer";
import path from "path";
import fs from "fs";

// const UPLOAD_PATH = "Public/categories";
// const ALLOWED_FILE_TYPE = /jpeg|jpg|png|webp/;
// const FILE_SIZE = 5 * 1024 * 1024;

export const FileUpload = (options) => {
  if (!options || typeof options !== "object") {
    throw new Error("FileUpload middleware requires an options object.");
  }
  const RequiredFields = [
    "fieldName",
    "ALLOWED_FILE_TYPE",
    "FILE_SIZE",
    "UPLOAD_PATH",
  ];
  for (const field of RequiredFields) {
    if (options[field] === undefined) {
      throw new Error(`Missing required parameter: ${field}`);
    }

    if (!options[field]) {
      throw new Error(`Missing required parameter: ${field}`);
    }
  }
  const {
    fieldName,
    required = false,
    ALLOWED_FILE_TYPE,
    FILE_SIZE,
    UPLOAD_PATH,
    multiple = false, // ✅ Add this line
    maxCount = 5,
  } = options;
  const FileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    if (ALLOWED_FILE_TYPE.test(ext) && ALLOWED_FILE_TYPE.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"));
    }
  };

  if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
  }

  const storage = multer.diskStorage({
    // destination: function (req, file, cb) {
    //   cb(null, UPLOAD_PATH);
    // },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const BaseName = path.basename(file.originalname, ext);
      const date = Date.now();
      cb(null, `${BaseName}-${date}${ext}`);
    },
  });

  const upload = multer({
    storage: storage,
    fileFilter: FileFilter,
    limits: { fileSize: FILE_SIZE },
  });

  return (req, res, next) => {
    const uploader = multiple
      ? upload.array(fieldName, maxCount)
      : upload.single(fieldName);

    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ message: err.message });
      }
      if (
        required &&
        ((multiple && !req.files?.length) || (!multiple && !req.file))
      ) {
        return res.status(400).json({
          message: `File upload for "${fieldName}" is required.`,
        });
      }
      next();
    });
  };
};