/**
 * DosageCalculator Component
 *
 * Provides clinical dosage calculations for prescriptions based on patient
 * parameters such as weight, age, and renal function.
 *
 * Features:
 * - Weight-based dosing (mg/kg)
 * - Body Surface Area (BSA) calculations (Mosteller formula)
 * - BSA-based dosing (mg/m²)
 * - Creatinine clearance estimation (Cockcroft-Gault)
 * - Pediatric dosing considerations
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Calculation types supported
 */
type CalculationType = 'weight_based' | 'bsa_based' | 'creatinine_clearance';

/**
 * DosageCalculator component props
 */
interface DosageCalculatorProps {
  /**
   * Patient weight in kg (if available from vitals)
   */
  patientWeight?: number;

  /**
   * Patient height in cm (if available from vitals)
   */
  patientHeight?: number;

  /**
   * Patient age in years
   */
  patientAge?: number;

  /**
   * Patient sex (for creatinine clearance)
   */
  patientSex?: 'male' | 'female';

  /**
   * Callback when a calculated dose is selected
   */
  onSelectDose?: (dose: string) => void;

  /**
   * Optional button variant
   */
  variant?: 'default' | 'outline' | 'ghost';

  /**
   * Optional button size
   */
  size?: 'default' | 'sm' | 'lg';
}

/**
 * DosageCalculator component
 */
export function DosageCalculator({
  patientWeight: initialWeight,
  patientHeight: initialHeight,
  patientAge,
  patientSex,
  onSelectDose,
  variant = 'outline',
  size = 'sm',
}: DosageCalculatorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [calculationType, setCalculationType] = useState<CalculationType>('weight_based');

  // Form state
  const [weight, setWeight] = useState<string>(initialWeight?.toString() || '');
  const [height, setHeight] = useState<string>(initialHeight?.toString() || '');
  const [dosePerKg, setDosePerKg] = useState<string>('');
  const [dosePerM2, setDosePerM2] = useState<string>('');
  const [serumCreatinine, setSerumCreatinine] = useState<string>('');
  const [sex, setSex] = useState<'male' | 'female'>(patientSex || 'male');

  // Calculated results
  const [result, setResult] = useState<string>('');
  const [bsa, setBsa] = useState<number | null>(null);
  const [crCl, setCrCl] = useState<number | null>(null);

  /**
   * Calculate Body Surface Area using Mosteller formula
   * BSA (m²) = √[(height (cm) × weight (kg)) / 3600]
   */
  const calculateBSA = (weightKg: number, heightCm: number): number => {
    return Math.sqrt((heightCm * weightKg) / 3600);
  };

  /**
   * Calculate Creatinine Clearance using Cockcroft-Gault formula
   * CrCl = ((140 - age) × weight) / (72 × SCr) × (0.85 if female)
   */
  const calculateCrCl = (
    age: number,
    weightKg: number,
    scrMgDl: number,
    isFemale: boolean
  ): number => {
    const base = ((140 - age) * weightKg) / (72 * scrMgDl);
    return isFemale ? base * 0.85 : base;
  };

  /**
   * Handle weight-based dosing calculation
   */
  const handleWeightBasedCalculation = () => {
    const weightNum = parseFloat(weight);
    const doseNum = parseFloat(dosePerKg);

    if (isNaN(weightNum) || isNaN(doseNum)) {
      setResult(t('visits.dosageCalculator.errors.invalidInput'));
      return;
    }

    const totalDose = weightNum * doseNum;
    setResult(t('visits.dosageCalculator.results.weightBased', { dose: totalDose.toFixed(2) }));
  };

  /**
   * Handle BSA-based dosing calculation
   */
  const handleBSABasedCalculation = () => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const doseNum = parseFloat(dosePerM2);

    if (isNaN(weightNum) || isNaN(heightNum) || isNaN(doseNum)) {
      setResult(t('visits.dosageCalculator.errors.invalidInput'));
      return;
    }

    const bsaValue = calculateBSA(weightNum, heightNum);
    setBsa(bsaValue);
    const totalDose = bsaValue * doseNum;
    setResult(
      t('visits.dosageCalculator.results.bsaBased', {
        bsa: bsaValue.toFixed(2),
        dose: totalDose.toFixed(2),
      })
    );
  };

  /**
   * Handle Creatinine Clearance calculation
   */
  const handleCrClCalculation = () => {
    if (!patientAge) {
      setResult(t('visits.dosageCalculator.errors.missingAge'));
      return;
    }

    const weightNum = parseFloat(weight);
    const scrNum = parseFloat(serumCreatinine);

    if (isNaN(weightNum) || isNaN(scrNum)) {
      setResult(t('visits.dosageCalculator.errors.invalidInput'));
      return;
    }

    const crClValue = calculateCrCl(patientAge, weightNum, scrNum, sex === 'female');
    setCrCl(crClValue);
    setResult(
      t('visits.dosageCalculator.results.creatinineClearance', {
        crcl: crClValue.toFixed(1),
      })
    );
  };

  /**
   * Handle calculation based on type
   */
  const handleCalculate = () => {
    setResult('');
    setBsa(null);
    setCrCl(null);

    switch (calculationType) {
      case 'weight_based':
        handleWeightBasedCalculation();
        break;
      case 'bsa_based':
        handleBSABasedCalculation();
        break;
      case 'creatinine_clearance':
        handleCrClCalculation();
        break;
    }
  };

  /**
   * Handle using the calculated dose
   */
  const handleUseDose = () => {
    if (result && onSelectDose) {
      onSelectDose(result);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Calculator className="h-4 w-4 mr-2" />
          {t('visits.dosageCalculator.buttonLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('visits.dosageCalculator.title')}</DialogTitle>
          <DialogDescription>{t('visits.dosageCalculator.description')}</DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t('visits.dosageCalculator.warning')}</AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Calculation Type Selection */}
          <div className="space-y-2">
            <Label>{t('visits.dosageCalculator.calculationType')}</Label>
            <Select
              value={calculationType}
              onValueChange={(value) => setCalculationType(value as CalculationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_based">
                  {t('visits.dosageCalculator.types.weightBased')}
                </SelectItem>
                <SelectItem value="bsa_based">
                  {t('visits.dosageCalculator.types.bsaBased')}
                </SelectItem>
                <SelectItem value="creatinine_clearance">
                  {t('visits.dosageCalculator.types.creatinineClearance')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weight-Based Dosing */}
          {calculationType === 'weight_based' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('visits.dosageCalculator.types.weightBased')}</CardTitle>
                <CardDescription>
                  {t('visits.dosageCalculator.descriptions.weightBased')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">{t('visits.dosageCalculator.fields.weight')}</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dose-per-kg">
                      {t('visits.dosageCalculator.fields.dosePerKg')}
                    </Label>
                    <Input
                      id="dose-per-kg"
                      type="number"
                      step="0.1"
                      placeholder="5"
                      value={dosePerKg}
                      onChange={(e) => setDosePerKg(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BSA-Based Dosing */}
          {calculationType === 'bsa_based' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('visits.dosageCalculator.types.bsaBased')}</CardTitle>
                <CardDescription>
                  {t('visits.dosageCalculator.descriptions.bsaBased')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight-bsa">{t('visits.dosageCalculator.fields.weight')}</Label>
                    <Input
                      id="weight-bsa"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">{t('visits.dosageCalculator.fields.height')}</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      placeholder="170"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose-per-m2">
                    {t('visits.dosageCalculator.fields.dosePerM2')}
                  </Label>
                  <Input
                    id="dose-per-m2"
                    type="number"
                    step="0.1"
                    placeholder="100"
                    value={dosePerM2}
                    onChange={(e) => setDosePerM2(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creatinine Clearance */}
          {calculationType === 'creatinine_clearance' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('visits.dosageCalculator.types.creatinineClearance')}</CardTitle>
                <CardDescription>
                  {t('visits.dosageCalculator.descriptions.creatinineClearance')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight-crcl">
                      {t('visits.dosageCalculator.fields.weight')}
                    </Label>
                    <Input
                      id="weight-crcl"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">{t('visits.dosageCalculator.fields.sex')}</Label>
                    <Select value={sex} onValueChange={(value) => setSex(value as 'male' | 'female')}>
                      <SelectTrigger id="sex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">
                          {t('visits.dosageCalculator.sex.male')}
                        </SelectItem>
                        <SelectItem value="female">
                          {t('visits.dosageCalculator.sex.female')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serum-creatinine">
                    {t('visits.dosageCalculator.fields.serumCreatinine')}
                  </Label>
                  <Input
                    id="serum-creatinine"
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={serumCreatinine}
                    onChange={(e) => setSerumCreatinine(e.target.value)}
                  />
                </div>
                {!patientAge && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('visits.dosageCalculator.errors.missingAge')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Calculate Button */}
          <Button onClick={handleCalculate} className="w-full">
            {t('visits.dosageCalculator.calculate')}
          </Button>

          {/* Results */}
          {result && (
            <Card className="bg-accent">
              <CardHeader>
                <CardTitle>{t('visits.dosageCalculator.result')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold mb-4">{result}</p>
                {onSelectDose && (
                  <Button onClick={handleUseDose} variant="default" className="w-full">
                    {t('visits.dosageCalculator.useDose')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
