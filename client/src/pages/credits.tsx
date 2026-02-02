import { useState } from "react";
import { useApp } from "@/lib/mock-data";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, TrendingUp, Shield } from "lucide-react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
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
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      // Create payment intent via Edge Function
      const { data: pi, error: piErr } = await supabase.functions.invoke("purchase_credits", {
        body: {
          amount: selectedPackage.price * 100, // Convert to cents
          credits: selectedPackage.credits,
          userId: user.id,
        },
      }) as { data: { clientSecret: string; paymentIntentId: string } | null; error: any };

      if (piErr) throw piErr;
      if (!pi?.clientSecret || !pi?.paymentIntentId) {
        throw new Error("Payment intent creation failed");
      }

      // Confirm the payment
      const result = await stripe.confirmCardPayment(pi.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user.email,
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Add credits to user account (mock mode handles this automatically)
      await purchaseCredits(selectedPackage.credits, pi.paymentIntentId);

      // In production mode, also confirm via Edge Function
      if (import.meta.env.VITE_SUPABASE_URL) {
        await supabase.functions.invoke("confirm_credit_purchase", {
          body: {
            userId: user.id,
            credits: selectedPackage.credits,
            paymentIntentId: pi.paymentIntentId,
          },
        });
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

        {/* Payment Form */}
        {selectedPackage && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
              <CardDescription>
                Purchasing {selectedPackage.credits} credits for ${selectedPackage.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#424770",
                        "::placeholder": {
                          color: "#aab7c4",
                        },
                      },
                      invalid: {
                        color: "#9e2146",
                      },
                    },
                  }}
                />
              </div>
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
