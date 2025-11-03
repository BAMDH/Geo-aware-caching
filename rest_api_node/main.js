import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import cacheRoutes from "./routes/cacheRoutes.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api", userRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/domain", cacheRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API Node.js funcionando correctamente 🚀" });
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`API segura corriendo en puerto ${PORT}`));
