type WitnessInput = {
  witnessName: string;
  action: string;
  result: "completed" | "missed";
  stake: number;
  score: number;
};

export function buildWitnessMessage(input: WitnessInput) {
  const { witnessName, action, result, stake, score } = input;

  if (result === "completed") {
    return `Lockstep update for ${witnessName}: I kept my pact — "${action}". Stake: ${stake} credits. Integrity: ${score}.`;
  }

  return `Lockstep update for ${witnessName}: I missed my pact — "${action}". Stake lost: ${stake} credits. Integrity: ${score}.`;
}