import categoryModal from "../Modal/category.modal.js";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_KEY_SECRET,
  secure: process.env.SECURE === "true",
});

export const CreateCategory = async (req, res) => {
  try {
    const fields = Object.keys(productModal.schema.paths);
    const filterFields = fields
      .filter(
        (key) =>
          key !== "__v" &&
          key !== "_id" &&
          key !== "deleted" &&
          key !== "deletedAt"
      )
      .filter((item) => {
        const value = req.body[item];
        return value === undefined || value === null || value === "";
      });
    if (filterFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        missing: filterFields,
      });
    }
    const FindCategory = await categoryModal.findOne({ title: req.body.name });
    if (FindCategory) {
      return res.status(400).json({ message: "category already exist" });
    }

    // const ImageURL = `${process.env.TEST_IMAGE_URL}/categories/${FileName}`;

    const files = req.file;

    const result = await cloudinary.v2.uploader.upload(files.path, {
      folder: "category",
    });

    const NewCategory = new categoryModal({
      ...req.body,
      image: {
        publicId: result.public_id,
        url: result.secure_url,
      },
    });
    await NewCategory.save();
    return res.status(201).json({ message: "category successfully created" });
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const FetchCategoryList = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const totalCategories = await categoryModal.countDocuments({
      deleted: false,
    });
    const totalPages = Math.ceil(totalCategories / limit);
    const categoryList = await categoryModal
      .find({ deleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-deleted -deletedAt");
    categoryList.reverse();
    return res.status(200).json({
      message: "categories fetched successfully",
      succuss: true,
      categoryList,
      totalPages,
      totalCategories,
      page: page,
      limit: limit,
    });
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const UpdateCategory = async (req, res) => {
  try {
    const categoryId = req.params._id;
    const fields = Object.keys(productModal.schema.paths);
    const filterFields = fields
      .filter(
        (key) =>
          key !== "__v" &&
          key !== "_id" &&
          key !== "deleted" &&
          key !== "deletedAt"
      )
      .filter((item) => {
        const value = req.body[item];
        return value === undefined || value === null || value === "";
      });
    if (filterFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        missing: filterFields,
      });
    }

    const existingCategory = await categoryModal.findOne({
      _id: categoryId,
      deleted: false,
    });

    if (!existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category does not exist" });
    }

    if (req.file) {
      let productImages;

      const files = req.file;

      const exist = await categoryModal.findById(categoryId);

      await cloudinary.v2.api.delete_resources(exist?.image?.publicId, {
        type: "upload",
        resource_type: "image",
      });

      const result = await cloudinary.v2.uploader.upload(files.path, {
        folder: "category",
      });

      productImages = {
        publicId: result.public_id,
        url: result.secure_url,
      };

      await categoryModal.updateOne(
        { _id: categoryId },
        { $set: { ...req.body, image: productImages } }
      );
    }
    const updatedCategory = await categoryModal.updateOne(
      { _id: categoryId },
      { $set: { ...req.body } }
    );
    return res.status(202).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("❌ Category update error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const DeleteCategory = async (req, res) => {
  try {
    const FindCategory = await categoryModal.findOne({
      _id: req.params._id,
      deleted: false,
    });
    if (!FindCategory) {
      return res
        .status(400)
        .json({ message: "Category Not Found", succuss: false });
    }

    const deletedCategory = await categoryModal.updateOne(
      { _id: req.params._id },
      { $set: { deleted: true, deletedAt: Date.now() } }
    );
    res.status(202).json({
      message: "Category Deleted Successfully",
      deletedCategory,
      succuss: true,
    });
  } catch (error) {
    return res.status(500).json(error.message);
  }
};
