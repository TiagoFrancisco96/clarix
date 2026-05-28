import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register the Better Auth route handlers on the Convex HTTP router
authComponent.registerRoutes(http, createAuth);

export default http;
