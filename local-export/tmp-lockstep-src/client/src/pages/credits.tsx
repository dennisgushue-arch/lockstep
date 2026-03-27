import { useState } from "react";
import { useApp } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Coins, Zap, TrendingUp, Shield, AlertTriangle, Copy, Check } from "lucide-react";
import { useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement } from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";

const CREDIT_PACKAGES = [
  {
    credits: 100,
    price: 9.99,
    pricePerCredit: 0.10,
    popular: false,
    description: "Perfect for getting started",
  },
  {
    credits: 250,
    price: 19.99,
    pricePerCredit: 0.08,
    popular: true,
    description: "Most popular choice",
    savings: "20% savings"
  },
  {
    credits: 500,
    price: 34.99,
    pricePerCredit: 0.07,
    popular: false,
    description: "Best value for serious goal-setters",
    savings: "30% savings"
  },
  {
    credits: 1000,
    price: 59.99,
    pricePerCredit: 0.06,
    popular: false,
    description: "For the ultimate commitment machine",
    savings: "40% savings"
  }
];

export default function CreditsPage() {
  const { user, creditBalance, purchaseCredits, creditTransactions } = useApp();
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTest, setCopiedTest] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handlePurchase = async () => {
    if (!selectedPackage || !stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) throw new Error("Card element not found");

      // Create payment intent via Edge Function
      const userId = user?.id || `user_${Date.now()}`;
      const { data: pi, error: piErr } = await supabase.functions.invoke("purchase_credits", {
        body: {
          amount: selectedPackage.price * 100, // Convert to cents
          credits: selectedPackage.credits,
          userId: userId,
        },
      }) as { data: { clientSecret: string; paymentIntentId: string } | null; error: any };

      if (piErr) {
        console.error("Edge function error:", piErr);
        throw new Error(piErr.message || "Failed to create payment intent");
      }
      if (!pi?.clientSecret || !pi?.paymentIntentId) {
        throw new Error("Payment intent creation failed - no client secret returned");
      }

      // Confirm the payment
      const result = await stripe.confirmCardPayment(pi.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user?.email || "user@example.com",
          },
        },
      });

      if (result.error) {
        console.error("Stripe payment error:", result.error);
        throw new Error(result.error.message);
      }

      console.log("Payment successful:", result.paymentIntent);

      // Add credits to user account (mock mode handles this automatically)
      await purchaseCredits(selectedPackage.credits, pi.paymentIntentId);

      // In production mode, also confirm via Edge Function
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { error: confirmErr } = await supabase.functions.invoke("confirm_credit_purchase", {
          body: {
            userId: userId,
            credits: selectedPackage.credits,
            paymentIntentId: pi.paymentIntentId,
          },
        });
        
        if (confirmErr) {
          console.error("Credit confirmation error:", confirmErr);
        }
      }

      setSelectedPackage(null);
      alert(`Successfully purchased ${selectedPackage.credits} credits!`);
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl py-8 space-y-8">
        {/* Current Balance */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-8 h-8 text-yellow-500" />
            <h1 className="text-4xl font-bold">Purchase Credits</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Current Balance: <span className="font-bold text-yellow-500">{creditBalance} credits</span>
          </p>
        </div>

        {/* How It Works */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              How Credits Work
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">Buy Credits</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Purchase credits upfront at discounted rates. The more you buy, the more you save.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Lock In Intents</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Spend credits to lock in your commitments. Higher stakes require more credits.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Get Refunds</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete your commitments and get your credits back. Fail and they're gone forever.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packages */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.credits}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                selectedPackage?.credits === pkg.credits
                  ? "ring-2 ring-primary shadow-lg"
                  : ""
              } ${pkg.popular ? "border-yellow-500 border-2" : ""}`}
              onClick={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <div className="mb-2">
                  <Coins className="w-12 h-12 mx-auto text-yellow-500" />
                </div>
                <CardTitle className="text-3xl">{pkg.credits}</CardTitle>
                <CardDescription>credits</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-4xl font-bold">${pkg.price}</div>
                <div className="text-sm text-muted-foreground">
                  ${pkg.pricePerCredit.toFixed(2)} per credit
                </div>
                {pkg.savings && (
                  <Badge variant="secondary" className="mt-2">
                    {pkg.savings}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground pt-2">
                  {pkg.description}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={selectedPackage?.credits === pkg.credits ? "default" : "outline"}
                >
                  {selectedPackage?.credits === pkg.credits ? "Selected" : "Select"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Stripe Configuration Warning */}
        {selectedPackage && !stripe && (
          <Card className="max-w-2xl mx-auto border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Stripe Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-800">
                Payment processing is not set up yet. To test payments in development, add your Stripe publishable key to <code className="bg-white px-2 py-1 rounded">client/.env.local</code>
              </p>
              
              <Alert className="bg-white border-amber-200">
                <AlertTitle className="text-sm font-semibold">Test Card Numbers</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded flex items-center justify-between cursor-pointer hover:bg-gray-200"
                       onClick={() => {
                         navigator.clipboard.writeText("4242 4242 4242 4242");
                         setCopiedTest(true);
                         setTimeout(() => setCopiedTest(false), 2000);
                       }}>
                      <span>4242 4242 4242 4242 (Success)</span>
                      {copiedTest ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </p>
                    <p className="text-xs text-gray-600">Any future date • Any 3-digit CVC</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Setup Instructions:</p>
                <ol className="text-xs space-y-1 ml-4 list-decimal text-amber-900">
                  <li>Visit <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">stripe.com/apikeys</a></li>
                  <li>Copy your <strong>Publishable Key</strong> (starts with <code className="bg-white px-1">pk_test_</code>)</li>
                  <li>Add to <code className="bg-white px-1">client/.env.local</code>:<br/>
                    <code className="bg-white px-2 py-1 rounded block mt-1 text-xs">VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY</code>
                  </li>
                  <li>Restart dev server: <code className="bg-white px-1">npm run dev</code></li>
                </ol>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                className="w-full"
              >
                Close
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Payment Form */}
        {selectedPackage && stripe && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
              <CardDescription>
                Purchasing {selectedPackage.credits} credits for ${selectedPackage.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Card Number</label>
                  <div className="p-4 border rounded-lg bg-white">
                    <CardNumberElement
                      options={{
                        style: {
                          base: {
                            fontSize: "18px",
                            color: "#1a1a1a",
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                            "::placeholder": {
                              color: "#9ca3af",
                            },
                          },
                          invalid: {
                            color: "#ef4444",
                            iconColor: "#ef4444",
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry Date</label>
                    <div className="p-4 border rounded-lg bg-white">
                      <CardExpiryElement
                        options={{
                          style: {
                            base: {
                              fontSize: "18px",
                              color: "#1a1a1a",
                              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                              "::placeholder": {
                                color: "#9ca3af",
                              },
                            },
                            invalid: {
                              color: "#ef4444",
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CVC</label>
                    <div className="p-4 border rounded-lg bg-white">
                      <CardCvcElement
                        options={{
                          style: {
                            base: {
                              fontSize: "18px",
                              color: "#1a1a1a",
                              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                              "::placeholder": {
                                color: "#9ca3af",
                              },
                            },
                            invalid: {
                              color: "#ef4444",
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your payment is secured by Stripe. We never store your card details.
              </p>
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={loading || !stripe}
                className="flex-1"
              >
                {loading ? "Processing..." : `Pay $${selectedPackage.price}`}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Transaction History */}
        {creditTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Your recent credit activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {creditTransactions.slice(0, 10).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleDateString()} at{" "}
                        {new Date(txn.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.type === 'purchase' || txn.type === 'refund' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {txn.type === 'purchase' || txn.type === 'refund' ? '+' : '-'}
                        {txn.amount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {txn.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
