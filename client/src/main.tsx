import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import App from "./App";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log("Stripe pk:", pk);

// Create stripe promise (can be null for mock mode)
const stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);

// Always provide Elements context to avoid hook errors
// When stripe is null, payment features will gracefully degrade
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
      <App />
    </Elements>
  </React.StrictMode>
);
