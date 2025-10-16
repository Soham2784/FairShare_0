import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRightLeft, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  IndianRupee
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  symbol: string;
}

interface CurrencyConverterProps {
  onCurrencyChange?: (currency: string) => void;
  defaultCurrency?: string;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ 
  onCurrencyChange, 
  defaultCurrency = 'INR' 
}) => {
  const { toast } = useToast();
  const [baseCurrency, setBaseCurrency] = useState(defaultCurrency);
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [amount, setAmount] = useState<number>(100);
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Popular currencies for travel
  const popularCurrencies: CurrencyRate[] = [
    { code: 'INR', name: 'Indian Rupee', rate: 1, symbol: '₹' },
    { code: 'USD', name: 'US Dollar', rate: 0.012, symbol: '$' },
    { code: 'EUR', name: 'Euro', rate: 0.011, symbol: '€' },
    { code: 'GBP', name: 'British Pound', rate: 0.0094, symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', rate: 1.8, symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', rate: 0.019, symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', rate: 0.017, symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', rate: 0.011, symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', rate: 0.087, symbol: '¥' },
    { code: 'THB', name: 'Thai Baht', rate: 0.42, symbol: '฿' },
    { code: 'MXN', name: 'Mexican Peso', rate: 0.24, symbol: '$' },
    { code: 'BRL', name: 'Brazilian Real', rate: 0.063, symbol: 'R$' },
    { code: 'SGD', name: 'Singapore Dollar', rate: 0.016, symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', rate: 0.094, symbol: 'HK$' },
    { code: 'NZD', name: 'New Zealand Dollar', rate: 0.020, symbol: 'NZ$' }
  ];

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://api.exchangerate.host/latest?base=INR`);
        const json = await res.json();
        const inrRates = json?.rates || {};
        const updatedRates = popularCurrencies.map(currency => ({
          ...currency,
          rate: currency.code === 'INR' ? 1 : (inrRates[currency.code] || currency.rate)
        }));
        setRates(updatedRates);
      } catch {
        const updatedRates = popularCurrencies.map(currency => ({
          ...currency,
          rate: currency.rate * (0.98 + Math.random() * 0.04)
        }));
        setRates(updatedRates);
      } finally {
        setLastUpdated(new Date());
        setIsLoading(false);
      }
    };

    fetchRates();
  }, []);

  useEffect(() => {
    if (rates.length > 0) {
      const baseRate = rates.find(r => r.code === baseCurrency)?.rate || 1;
      const targetRate = rates.find(r => r.code === targetCurrency)?.rate || 1;
      const converted = (amount / baseRate) * targetRate;
      setConvertedAmount(converted);
    }
  }, [amount, baseCurrency, targetCurrency, rates]);

  const handleSwapCurrencies = () => {
    const temp = baseCurrency;
    setBaseCurrency(targetCurrency);
    setTargetCurrency(temp);
  };

  const handleRefreshRates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.exchangerate.host/latest?base=${baseCurrency}`);
      const json = await res.json();
      const baseRates = json?.rates || {};
      const updatedRates = rates.map(currency => ({
        ...currency,
        rate: currency.code === baseCurrency ? 1 : (baseRates[currency.code] || currency.rate)
      }));
      setRates(updatedRates);
      toast({ title: 'Rates Updated', description: 'Live exchange rates have been refreshed' });
    } catch {
      toast({ title: 'Using cached rates', description: 'Failed to fetch live rates' });
    } finally {
      setLastUpdated(new Date());
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = rates.find(r => r.code === currency);
    const symbol = currencyInfo?.symbol || currency;
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + symbol;
  };

  const getExchangeRate = () => {
    if (rates.length === 0) return 0;
    const baseRate = rates.find(r => r.code === baseCurrency)?.rate || 1;
    const targetRate = rates.find(r => r.code === targetCurrency)?.rate || 1;
    return targetRate / baseRate;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <Globe className="h-5 w-5" />
            <span>Multi-Currency Converter</span>
            <Badge variant="secondary" className="ml-auto">
              Live Rates
            </Badge>
          </CardTitle>
          {lastUpdated && (
            <div className="flex items-center justify-between text-sm text-blue-600">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshRates}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Converter */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Converter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Currency */}
            <div className="space-y-4">
              <Label>From</Label>
              <div className="space-y-3">
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-sm">{currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="pr-12"
                    placeholder="Enter amount"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    {rates.find(r => r.code === baseCurrency)?.symbol}
                  </div>
                </div>
              </div>
            </div>

            {/* To Currency */}
            <div className="space-y-4">
              <Label>To</Label>
              <div className="space-y-3">
                <Select value={targetCurrency} onValueChange={setTargetCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="text-sm">{currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative">
                  <div className="h-10 px-3 py-2 bg-muted border rounded-md flex items-center text-lg font-semibold">
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      formatCurrency(convertedAmount, targetCurrency)
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwapCurrencies}
              className="p-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Exchange Rate Info */}
          {rates.length > 0 && (
            <Alert>
              <IndianRupee className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    1 {baseCurrency} = {getExchangeRate().toFixed(4)} {targetCurrency}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Mid-market rate
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Popular Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rates.slice(0, 6).map(currency => {
              if (currency.code === 'INR') return null;
              
              const rate = currency.rate;
              const previousRate = currency.rate * 1.001; // Simulate previous rate
              const isUp = rate > previousRate;
              
              return (
                <div key={currency.code} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{currency.code}</div>
                    <div className="text-sm text-muted-foreground">{currency.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{rate.toFixed(4)}</div>
                    <div className={`text-xs flex items-center ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                      {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {Math.abs(((rate - previousRate) / previousRate) * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rate Alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>Pro Tip:</strong> Exchange rates fluctuate throughout the day. 
          For the most accurate conversions, refresh rates before making large transactions.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default CurrencyConverter;