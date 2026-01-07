import React from "react";
import { createRoot } from "react-dom/client";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import App from "./App";
import "./index.css";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log("Stripe pk:", pk);
if (!pk) {
// This makes the problem obvious instead of silently failing
console.error("Missing VITE_STRIPE_PUBLISHABLE_KEY in env");
}

const stripePromise = loadStripe(pk!);

createRoot(document.getElementById("root")!).render(
<React.StrictMode>
<Elements stripe={stripePromise}>
<App />
</Elements>
</React.StrictMode>
);
