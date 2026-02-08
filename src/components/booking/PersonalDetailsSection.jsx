import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Mail, User, Instagram, FileText, Bell } from 'lucide-react';

// המרת שגיאות לעברית
const translateErrorToHebrew = (error) => {
  if (!error) return null;
  
  // אם השגיאה כבר בעברית
  if (/[\u0590-\u05FF]/.test(error)) return error;
  
  // מילון תרגום לשגיאות נפוצות
  const errorTranslations = {
    'payment failed': 'התשלום נכשל, אנא נסו שוב',
    'payment cancelled': 'התשלום בוטל',
    'payment error': 'שגיאה בתהליך התשלום',
    'network error': 'שגיאת רשת, אנא בדקו את החיבור ונסו שוב',
    'timeout': 'הבקשה נכשלה עקב זמן המתנה ארוך',
    'invalid data': 'הנתונים שהוזנו אינם תקינים',
    'booking failed': 'ההזמנה נכשלה, אנא נסו שוב',
    'session expired': 'פג תוקף החיבור, אנא רעננו את הדף',
    'no available slots': 'אין מקומות פנויים במועד הנבחר',
    'missing required fields': 'יש למלא את כל שדות החובה',
  };
  
  // בדיקה אם יש תרגום מתאים
  const lowerError = error.toLowerCase();
  for (const [key, translation] of Object.entries(errorTranslations)) {
    if (lowerError.includes(key)) {
      return translation;
    }
  }
  
  // שגיאה כללית בעברית
  return 'אירעה שגיאה בתהליך ההזמנה. אנא נסו שוב או פנו לתמיכה.';
};

export default function PersonalDetailsSection({ 
  userDetails, 
  setUserDetails, 
  onSubmit,
  isSubmitting,
  bookingError = null,
  onClearError
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // תרגום השגיאה לעברית
  const hebrewError = translateErrorToHebrew(bookingError);

  const handleChange = (field, value) => {
    setUserDetails({ ...userDetails, [field]: value });
  };

  const isValid = userDetails.full_name && userDetails.email && userDetails.phone && termsAccepted;

  return (
    <div className="py-4" dir="rtl">
      <div className="space-y-4">
        {/* שם מלא */}
        <div>
          <Label htmlFor="full_name" className="flex items-center gap-2 text-[#464646]">
            <User className="w-4 h-4" />
            שם מלא *
          </Label>
          <Input
            id="full_name"
            value={userDetails.full_name || ''}
            onChange={(e) => handleChange('full_name', e.target.value)}
            placeholder="הכניסו את שמכם המלא"
            required
            className="mt-1 border-[#e8e8e8] focus:border-[#ADC178] focus:ring-[#ADC178]"
          />
        </div>

        {/* אימייל */}
        <div>
          <Label htmlFor="email" className="flex items-center gap-2 text-[#464646]">
            <Mail className="w-4 h-4" />
            אימייל *
          </Label>
          <Input
            id="email"
            type="email"
            value={userDetails.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="your@email.com"
            required
            dir="ltr"
            className="mt-1 border-[#e8e8e8] focus:border-[#ADC178] focus:ring-[#ADC178]"
          />
        </div>

        {/* טלפון */}
        <div>
          <Label htmlFor="phone" className="flex items-center gap-2 text-[#464646]">
            <Phone className="w-4 h-4" />
            טלפון *
          </Label>
          <Input
            id="phone"
            type="tel"
            value={userDetails.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="050-0000000"
            required
            dir="ltr"
            className="mt-1 border-[#e8e8e8] focus:border-[#ADC178] focus:ring-[#ADC178]"
          />
          <p className="text-xs text-[#464646]/70 mt-1 flex items-center gap-1">
            <Bell className="w-3 h-3" />
            תישלח תזכורת 24 שעות לפני המפגש
          </p>
        </div>

        {/* הערות */}
        <div>
          <Label htmlFor="notes" className="flex items-center gap-2 text-[#464646]">
            <FileText className="w-4 h-4" />
            הערות (אופציונלי)
          </Label>
          <Textarea
            id="notes"
            value={userDetails.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="משהו שחשוב לנו לדעת?"
            className="mt-1 min-h-[80px] border-[#e8e8e8] focus:border-[#ADC178] focus:ring-[#ADC178]"
          />
        </div>

        {/* אינסטגרם */}
        <div>
          <Label htmlFor="instagram" className="flex items-center gap-2 text-[#464646]">
            <Instagram className="w-4 h-4" />
            אינסטגרם לתיוג תמונות (אופציונלי)
          </Label>
          <Input
            id="instagram"
            value={userDetails.instagram || ''}
            onChange={(e) => handleChange('instagram', e.target.value)}
            placeholder="@username"
            dir="ltr"
            className="mt-1 border-[#e8e8e8] focus:border-[#ADC178] focus:ring-[#ADC178]"
          />
        </div>

        {/* אישורים */}
        <div className="space-y-3 pt-4 border-t border-[#e8e8e8]">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-sm font-normal text-[#464646] leading-relaxed">
              קראתי ואני מאשר/ת את <a href="#" className="text-[#ADC178] underline">תנאי השימוש</a> ואת <a href="#" className="text-[#ADC178] underline">מדיניות הביטולים</a> *
            </Label>
          </div>
          
          <div className="flex items-start gap-3">
            <Checkbox
              id="marketing"
              checked={userDetails.marketing_consent || false}
              onCheckedChange={(checked) => handleChange('marketing_consent', checked)}
              className="mt-0.5"
            />
            <Label htmlFor="marketing" className="text-sm font-normal text-[#464646]">
              אני מעוניין/ת לקבל עדכונים על סדנאות ומבצעים
            </Label>
          </div>
        </div>
      </div>

      {/* כפתור המשך */}
      <div className="flex flex-col items-center mt-8 gap-3">
        <Button
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-50"
        >
          {isSubmitting ? 'מעבד...' : 'מעבר לתשלום'}
        </Button>
        {hebrewError && (
          <p className="text-sm text-red-600 text-center max-w-md bg-red-50 border border-red-200 rounded-lg px-4 py-2" role="alert">
            {hebrewError}
          </p>
        )}
      </div>
    </div>
  );
}