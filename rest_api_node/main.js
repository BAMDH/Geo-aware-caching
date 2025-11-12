import express from "express";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

import userRoutes from "./api/userRoutes.js";
import domainRoutes from "./api/domainRoutes.js";
import cacheRoutes from "./api/cacheRoutes.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(
    cors({
        origin: [
            "https://p02uiapp.vercel.app", // tu frontend en producción
            "http://localhost:5173"        // para desarrollo local    
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.use("/users", userRoutes);
app.use("/domains", domainRoutes);
app.use("/domain", cacheRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API Node.js funcionando correctamente" });
});

//const PORT = process.env.PORT;
//app.listen(PORT, () => console.log(`API segura corriendo en puerto ${PORT}`));

export default app;