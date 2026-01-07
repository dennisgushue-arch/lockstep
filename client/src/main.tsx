import React from "react";
import { createRoot } from "react-dom/client";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import App from "./App";
import "./index.css";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log("Stripe pk:", pk);

const stripePromise = pk ? loadStripe(pk) : null;

function StripeFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-md w-full space-y-8 border-2 border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/20 mb-2">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-white uppercase font-heading">Missing Keys</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Payment features are disabled. Please configure <code className="text-primary font-mono px-1 bg-primary/10 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> in your environment secrets.
          </p>
        </div>
        
        <div className="pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black py-4 font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.98] rounded-none"
          >
            Retry Connection
          </button>
        </div>
        
        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-[0.2em] pt-4">
          Intent — This app is not gentle.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {stripePromise ? (
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    ) : (
      <StripeFallback />
    )}
  </React.StrictMode>
);
