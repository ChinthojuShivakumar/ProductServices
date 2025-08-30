import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDb from "./Src/Config/config.js";
import productRoute from "./Src/Routes/product.routes.js";
import categoryRoute from "./Src/Routes/category.routes.js";

dotenv.config();


const app = express();
connectDb();
app.use(cors("*"));
app.use(morgan("dev"));

app.use("/v1", categoryRoute);
app.use("/v1", productRoute);

app.listen(5052, () => {
  console.info("Server connected and running on port: ", 5052);
});
