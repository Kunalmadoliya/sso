import jwt from "jsonwebtoken";
import db from "../../db/index";
import { eq } from "drizzle-orm";
import { usersTable } from "../../db/schema";

export const authenticate = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, decoded.id));

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
        };

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};