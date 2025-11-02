import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import router from "./routes/index.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api", router);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API segura corriendo en puerto ${PORT}`));
