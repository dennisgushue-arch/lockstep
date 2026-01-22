import React from "react";
import { createRoot } from "react-dom/client";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import App from "./App";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log("Stripe pk exists:", !!pk, "prefix:", pk?.slice(0, 7));

const stripePromise = pk ? loadStripe(pk) : null;

createRoot(document.getElementById("root")!).render(
<React.StrictMode>
{stripePromise ? (
<Elements stripe={stripePromise}>
<App />
</Elements>
) : (
<div style={{ padding: 24, fontFamily: "sans-serif" }}>
Missing <code>VITE_STRIPE_PUBLISHABLE_KEY</code>. Add it in env vars and restart.
</div>
)}
</React.StrictMode>
);

