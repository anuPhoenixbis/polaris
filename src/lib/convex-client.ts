import { ConvexHttpClient } from "convex/browser";

export const convex = new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL!
)
// this client will allow all the things like create convex function wherever we want and not limited inside the convex folder only