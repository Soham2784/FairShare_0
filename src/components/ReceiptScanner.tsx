import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  FileText, 
  Upload, 
  CheckCircle, 
  Loader2, 
  X,
  Scan,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Expense, ExpenseCategory } from '@/types';

interface ReceiptScannerProps {
  onExpenseDetected: (expense: Partial<Expense>) => void;
  onClose: () => void;
}

interface ScannedData {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: Date;
  confidence: number;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onExpenseDetected, onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setScannedImage(imageUrl);
      processReceipt(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const processReceipt = async (imageUrl: string) => {
    setIsScanning(true);
    
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock OCR results - in reality, this would use a service like Tesseract.js or cloud OCR
      const mockResults = [
        {
          amount: 89.50,
          description: "Dinner at Seaside Restaurant",
          category: 'food' as ExpenseCategory,
          date: new Date(),
          confidence: 0.92
        },
        {
          amount: 25.75,
          description: "Coffee Shop Purchase",
          category: 'food' as ExpenseCategory,
          date: new Date(),
          confidence: 0.88
        },
        {
          amount: 15.00,
          description: "Metro Card Top-up",
          category: 'transport' as ExpenseCategory,
          date: new Date(),
          confidence: 0.95
        },
        {
          amount: 120.00,
          description: "Hotel Service Charge",
          category: 'accommodation' as ExpenseCategory,
          date: new Date(),
          confidence: 0.85
        }
      ];
      
      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      setScannedData(randomResult);
      
      toast({
        title: "Receipt scanned successfully!",
        description: `Found expense: ${randomResult.description} - $${randomResult.amount}`,
      });
      
    } catch (error) {
      toast({
        title: "Scanning failed",
        description: "Could not process the receipt. Please try again or enter manually.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseScannedData = () => {
    if (!scannedData) return;
    
    onExpenseDetected({
      amount: scannedData.amount,
      description: scannedData.description,
      category: scannedData.category,
      date: scannedData.date,
      currency: 'USD'
    });
    
    toast({
      title: "Expense added",
      description: "Scanned expense has been added to the form",
    });
    
    onClose();
  };

  const handleEditAndUse = () => {
    if (!scannedData) return;
    
    // Pre-fill the expense form with scanned data for manual editing
    onExpenseDetected({
      amount: scannedData.amount,
      description: scannedData.description,
      category: scannedData.category,
      date: scannedData.date,
      currency: 'USD'
    });
    
    onClose();
  };

  const resetScanner = () => {
    setScannedImage(null);
    setScannedData(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Scan className="h-5 w-5 text-indigo-600" />
              <span>Smart Receipt Scanner</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {!scannedImage ? (
            /* Upload Section */
            <div className="space-y-6">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Scan Your Receipt</h3>
                <p className="text-muted-foreground">
                  Upload a photo of your receipt to automatically extract expense details
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                  variant="outline"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8" />
                    <span className="font-medium">Upload Receipt Photo</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG up to 10MB</span>
                  </div>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Supported formats:</strong> Clear photos of receipts, invoices, or bills. 
                  Make sure text is readable and well-lit for best results.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            /* Scanning/Results Section */
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="relative">
                <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={scannedImage} 
                    alt="Scanned receipt" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute top-2 right-2 flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetScanner}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Scanning Progress */}
              {isScanning && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">Processing receipt...</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Using AI to extract expense details
                  </div>
                </div>
              )}

              {/* Scanned Results */}
              {scannedData && !isScanning && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">Receipt processed successfully!</span>
                    <Badge 
                      variant="outline" 
                      className={getConfidenceColor(scannedData.confidence)}
                    >
                      {getConfidenceLabel(scannedData.confidence)} Confidence
                    </Badge>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Amount</Label>
                          <div className="font-semibold text-lg">${scannedData.amount.toFixed(2)}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <Badge variant="secondary" className="capitalize">
                            {scannedData.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <div className="font-medium">{scannedData.description}</div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <div className="text-sm">{scannedData.date.toLocaleDateString()}</div>
                      </div>
                    </CardContent>
                  </Card>

                  {scannedData.confidence < 0.8 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Low confidence scan. Please review the extracted details before using.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleUseScannedData}
                      className="flex-1"
                      disabled={scannedData.confidence < 0.5}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Use These Details
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleEditAndUse}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Edit & Use
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <Button variant="outline" onClick={resetScanner}>
                  Scan Another Receipt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptScanner;