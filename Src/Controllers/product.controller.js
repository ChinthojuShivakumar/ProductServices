import dotenv from "dotenv";
import categoryModal from "../Modal/category.modal.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import productModal from "../Modal/product.modal.js";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_KEY_SECRET,
  secure: process.env.SECURE === "true",
});

export const createProduct = async (req, res) => {
  try {
   
    
    const fields = Object.keys(productModal.schema.paths);
    const filterFields = fields
      .filter(
        (key) =>
          key !== "__v" &&
          key !== "_id" &&
          key !== "deleted" &&
          key !== "deletedAt" &&
          key !== "reviewList" &&
          key !== "totalReviews" &&
          key !== "images" &&
          key !== "rating" &&
          key !== "specifications" &&
          !key.includes("$")
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

    const findProduct = await productModal.findOne({
      name: req.body.name,
      deleted: false,
    });
    if (findProduct) {
      return res
        .status(400)
        .json({ success: false, message: "Product Already Exist" });
    }

    let productImages = [];

    const files = req.files;

    const convertToURL = await Promise.all(
      files.map((file) =>
        cloudinary.v2.uploader.upload(file.path, { folder: "products" })
      )
    );

    productImages = convertToURL.map((result) => ({
      publicId: result.public_id,
      url: result.secure_url,
    }));

    if (
      req.body.specifications &&
      typeof req.body.specifications === "string"
    ) {
      req.body.specifications = JSON.parse(req.body.specifications);
    }
    const newProduct = new productModal({ ...req.body, images: productImages });
    await newProduct.save();
    return res.status(201).json({
      message: "product added successfully",
      success: true,
      newProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params._id;

    // Step 1: Find the existing product
    const existingProduct = await productModal.findOne({
      _id: productId,
      deleted: false,
    });

    if (!existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product does not exist",
      });
    }

    const fields = Object.keys(productModal.schema.paths);
    const filterFields = fields
      .filter(
        (key) =>
          key !== "__v" &&
          key !== "_id" &&
          key !== "deleted" &&
          key !== "deletedAt" &&
          key !== "reviewList" &&
          key !== "totalReviews" &&
          !key.includes("$")
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

    const exist = await productModal.findById(productId);

    const publicIds = exist?.images?.map((img) => img?.publicId);

    await cloudinary.v2.api.delete_resources(publicIds, {
      type: "upload",
      resource_type: "image",
    });

    // cloudinary.v2.api.delete_resources([exist.public_id], { type: "upload", resource_type: "image" })

    let productImages = [];

    const uploadFiles = await Promise.all(
      req.files.map((file) =>
        cloudinary.v2.uploader.upload(file.path, { folder: "products" })
      )
    );

    productImages = uploadFiles.map((result) => ({
      publicId: result.public_id,
      url: result.secure_url,
    }));

    // Step 3: Handle specifications field
    if (
      req.body.specifications &&
      typeof req.body.specifications === "string"
    ) {
      req.body.specifications = JSON.parse(req.body.specifications);
    }

    if (
      req.body.specifications &&
      typeof req.body.specifications === "object"
    ) {
      req.body.specifications = new Map(
        Object.entries(req.body.specifications)
      );
    }

    // Step 4: Update the product
    const updatedProduct = await productModal.findByIdAndUpdate(
      productId,
      {
        ...req.body,
        images: productImages,
      },
      { new: true } // return updated document
    );

    return res.status(202).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const fetchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    const filters = {
      deleted: false,
    };

    if (req.query.category) {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(
        req.query.category
      );

      const findCategory = await categoryModal.findOne(
        isValidObjectId
          ? { _id: req.query.category }
          : { name: req.query.category }
      );

      if (findCategory) {
        filters.category = findCategory._id;
      } else {
        return res
          .status(404)
          .json({ message: "Category not found", success: false });
      }
    }
    const price = req.query?.price?.split("-");
    if (price && price?.length === 2)
      filters.price = { $gte: price[0], $lte: price[1] };

    if (req.query.keyword) {
      const regex = { $regex: req.query.keyword, $options: "i" };
      filters.$or = [{ name: regex }, { description: regex }];
    }

    const totalCategories = await productModal.countDocuments(filters);
    const totalPages = Math.ceil(totalCategories / limit);

    const productList = await productModal
      .find(filters)
      .skip(skip)
      .populate({
        path: "category",
        select: "_id name",
      })
      .limit(limit)
      .select("-deleted -deletedAt")
      .lean();

    // const productIds = productList.map((product) => product._id);

    // const reviewList = await reviewModal
    //   .find({
    //     productId: { $in: productIds },
    //   })
    //   .select("-__v -deleted -deletedAt")
    //   .populate("userId", "name email");

    // const reviewMap = {};

    // for (const review of reviewList) {
    //   const pId = review.productId.toString();
    //   if (!reviewMap[pId]) reviewMap[pId] = [];
    //   reviewMap[pId].push(review);
    // }

    const enrichedProducts = productList.map((product) => {
      const plainProduct = product;
      return {
        ...plainProduct,
        // reviewList: reviewMap[product._id.toString()] || [],
      };
    });

    return res.status(200).json({
      message: "products fetched successfully",
      success: true,
      productList: enrichedProducts,
      totalPages,
      totalCategories,
      page: page,
      limit: limit,
      filters,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const findProduct = await productModal.findOne({ _id: req.params._id });
    if (!findProduct) {
      return res
        .status(404)
        .json({ message: "Product Not Found", success: false });
    }
    const deletedProduct = await productModal.updateOne(
      { _id: req.params._id },
      { deleted: true, deletedAt: Date.now() }
    );
    return res.status(202).json({
      message: "product deleted success",
      success: true,
      deletedProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchSingleProduct = async (req, res) => {
  try {
    const queryValue = req.query.q;

    const isObjectId = mongoose.Types.ObjectId.isValid(queryValue);

    const findProduct = await productModal
      .findOne({
        $or: [
          { name: queryValue },
          ...(isObjectId
            ? [{ _id: new mongoose.Types.ObjectId(queryValue) }]
            : []),
        ],
        deleted: false,
      })
      .select("-deleted -deletedAt")
      .populate({
        path: "category",
        select: "_id name",
      });
    if (!findProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found :(" });
    }
    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      Product: findProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
