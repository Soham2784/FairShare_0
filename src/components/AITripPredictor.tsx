import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Brain, IndianRupee, Utensils, Plane, Home, Package } from 'lucide-react';
import { TripPredictionInput, AITripPrediction } from '@/types';

interface AITripPredictorProps {
  onClose: () => void;
}

const defaultInput: TripPredictionInput = {
  numberOfPeople: 2,
  destination: '',
  duration: 5,
  activities: [],
  demographics: {
    averageAge: 25,
    genderMix: 'mixed',
  },
};

function generateRecommendations(input: TripPredictionInput): string[] {
  const recs: string[] = [];
  if (input.numberOfPeople >= 4) recs.push('Consider group discounts for activities and transport.');
  if (input.duration > 7) recs.push('Weekly rentals may be cheaper than nightly stays.');
  if (input.demographics.averageAge < 26) recs.push('Look for student/youth discounts where available.');
  if (!recs.length) recs.push('Book in advance for better prices and availability.');
  return recs;
}

const AITripPredictor: React.FC<AITripPredictorProps> = ({ onClose }) => {
  const [input, setInput] = useState<TripPredictionInput>(defaultInput);
  const [prediction, setPrediction] = useState<AITripPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Hardcoded current location to use during analysis (no geolocation)
  const HARDCODED_CURRENT_LOCATION = 'Mumbai, India';

  const generatePrediction = async () => {
    if (!input.destination) {
      alert('Please select a destination first!');
      return;
    }

    setIsLoading(true);
    setPrediction(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: input.destination.split(',')[0],
          days: input.duration,
          travel_way: 'flight',
          people: input.numberOfPeople,
          avg_age: input.demographics.averageAge,
          gender: input.demographics.genderMix,
          // Provide the user's current location as a hardcoded value for backend context
          current_location: HARDCODED_CURRENT_LOCATION,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      if (result?.error) throw new Error(result.error);

      // Convert from USD to INR (backend returns USD, we display INR)
      const USD_TO_INR = 83.0;
      const totalCostUSD = Number(result.predicted_total_cost);
      const totalCost = totalCostUSD * USD_TO_INR;
      const perPersonCost = totalCost / input.numberOfPeople;

      // Derive a user-friendly breakdown the way you asked (Food, Travel, Accommodation, Essentials)
      // Heuristic: adjust by trip duration and group size a bit
      const base = {
        accommodation: 0.38, // stays dominate
        food: 0.28,
        transport: 0.22, // inter/intra city travel
        entertainment: 0.07,
        shopping: 0.03,
        other: 0.02,
      };

      const longTripBoost = Math.min(0.06, Math.max(0, (input.duration - 7) * 0.005));
      const groupSizeDiscount = Math.min(0.05, Math.max(0, (input.numberOfPeople - 2) * 0.01));
      // Longer trips: accommodation+food slightly up, transport slightly down (amortized)
      base.accommodation += longTripBoost;
      base.food += longTripBoost / 2;
      base.transport -= longTripBoost;
      // Bigger groups: per-person transport/entertainment can be optimized
      base.transport -= groupSizeDiscount / 2;
      base.entertainment -= groupSizeDiscount / 3;
      // Re-normalize to 1
      const sum = Object.values(base).reduce((a, b) => a + b, 0);
      Object.keys(base).forEach((k) => { (base as any)[k] = (base as any)[k] / sum; });

      const predictionData: AITripPrediction = {
        totalCost,
        perPersonCost,
        breakdown: {
          accommodation: totalCost * base.accommodation,
          food: totalCost * base.food,
          transport: totalCost * base.transport,
          entertainment: totalCost * base.entertainment,
          shopping: totalCost * base.shopping,
          other: totalCost * base.other,
        },
        confidence: 0.9,
        recommendations: generateRecommendations(input),
      };

      setPrediction(predictionData);
    } catch (error: any) {
      console.error('Prediction error:', error);
      alert(error?.message || 'Failed to get prediction. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>AI Trip Cost Predictor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Paris, France"
                value={input.destination}
                onChange={(e) => setInput((p) => ({ ...p, destination: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={input.duration}
                onChange={(e) => setInput((p) => ({ ...p, duration: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="people">Number of people</Label>
              <Input
                id="people"
                type="number"
                min={1}
                value={input.numberOfPeople}
                onChange={(e) => setInput((p) => ({ ...p, numberOfPeople: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Average age</Label>
              <Input
                id="age"
                type="number"
                min={1}
                value={input.demographics.averageAge}
                onChange={(e) => setInput((p) => ({ ...p, demographics: { ...p.demographics, averageAge: Number(e.target.value || 0) } }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender mix</Label>
              <Select
                value={input.demographics.genderMix}
                onValueChange={(v) => setInput((p) => ({ ...p, demographics: { ...p.demographics, genderMix: v as 'mixed' | 'male' | 'female' } }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <div className="text-sm text-muted-foreground">
                Using current location: <span className="font-medium">{HARDCODED_CURRENT_LOCATION}</span>
              </div>
            </div>
          </div>

          {prediction && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Estimated total</div>
                <div className="text-2xl font-bold flex items-center gap-2"><IndianRupee className="h-5 w-5" />₹{prediction.totalCost.toFixed(2)}</div>
                <div className="text-muted-foreground">Per person: ₹{prediction.perPersonCost.toFixed(2)}</div>
              </div>

              {/* Breakdown tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BreakdownTile
                  icon={<Home className="h-4 w-4" />}
                  title="Accommodation"
                  amount={prediction.breakdown.accommodation}
                  total={prediction.totalCost}
                  barClass="bg-blue-600"
                />
                <BreakdownTile
                  icon={<Utensils className="h-4 w-4" />}
                  title="Food"
                  amount={prediction.breakdown.food}
                  total={prediction.totalCost}
                  barClass="bg-emerald-600"
                />
                <BreakdownTile
                  icon={<Plane className="h-4 w-4" />}
                  title="Travel"
                  amount={prediction.breakdown.transport}
                  total={prediction.totalCost}
                  barClass="bg-indigo-600"
                />
                <BreakdownTile
                  icon={<Package className="h-4 w-4" />}
                  title="Essentials"
                  amount={prediction.breakdown.entertainment + prediction.breakdown.shopping + prediction.breakdown.other}
                  total={prediction.totalCost}
                  barClass="bg-amber-600"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={generatePrediction} disabled={!input.destination || isLoading} className="bg-ai-gradient hover:opacity-90">
              {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Analyzing...</>) : (<><Brain className="h-4 w-4 mr-2"/>Generate Prediction</>)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function BreakdownTile({ icon, title, amount, total, barClass }: { icon: React.ReactNode; title: string; amount: number; total: number; barClass: string; }) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          <span>{title}</span>
        </div>
        <div>₹{amount.toFixed(2)}</div>
      </div>
      <div className="h-2 w-full bg-muted rounded">
        <div className={`h-2 rounded ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{pct}% of total</div>
    </div>
  );
}

export default AITripPredictor;
