import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** טלפון ישראלי: בדיוק 10 ספרות, מתחיל ב-05, ללא תווים מיוחדים */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && digits.startsWith('05');
}

export default function PersonalDetailsSection({ userDetails, setUserDetails, onContinue, isSubmitting }) {
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  const handleChange = (field, value) => {
    if (field === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setUserDetails(prev => ({ ...prev, [field]: digitsOnly }));
    } else {
      setUserDetails(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const name = userDetails?.name || '';
  const email = userDetails?.email || '';
  const phone = userDetails?.phone || '';

  const nameError = touched.name && !name.trim()
    ? 'שם מלא הוא שדה חובה'
    : null;

  const emailError = touched.email && !validateEmail(email)
    ? 'כתובת אימייל לא תקינה'
    : null;

  const phoneError = touched.phone && !validatePhone(phone)
    ? 'הזן מספר ישראלי בן 10 ספרות שמתחיל ב-05 (ללא מקפים או רווחים)'
    : null;

  const isValid =
    name.trim() &&
    validateEmail(email) &&
    validatePhone(phone);

  const handleSubmit = () => {
    setTouched({ name: true, email: true, phone: true });
    if (isValid) {
      onContinue();
    }
  };

  return (
    <div className="flex flex-col py-6 px-2" dir="rtl">
      <p className="text-sm text-[#464646]/70 mb-6 text-center">
        אנחנו צריכים את הפרטים שלך כדי לאשר את ההזמנה ולשלוח אישור
      </p>

      <div className="space-y-5 max-w-sm mx-auto w-full">
        {/* שם מלא */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#6B584C] flex items-center gap-2">
            <User className="w-4 h-4 text-[#ADC178]" />
            שם מלא
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="ישראל ישראלי"
            className={`w-full px-4 py-3 border rounded-lg text-[#464646] bg-white
              placeholder:text-[#464646]/40 focus:outline-none focus:ring-2
              transition-all duration-200
              ${nameError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-[#e8e8e8] focus:ring-[#ADC178]/30 focus:border-[#ADC178]'
              }`}
          />
          {nameError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500"
            >
              {nameError}
            </motion.p>
          )}
        </div>

        {/* אימייל */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#6B584C] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#ADC178]" />
            כתובת אימייל
            <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="israel@example.com"
            dir="ltr"
            className={`w-full px-4 py-3 border rounded-lg text-[#464646] bg-white
              placeholder:text-[#464646]/40 focus:outline-none focus:ring-2
              transition-all duration-200
              ${emailError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-[#e8e8e8] focus:ring-[#ADC178]/30 focus:border-[#ADC178]'
              }`}
          />
          {emailError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500"
            >
              {emailError}
            </motion.p>
          )}
        </div>

        {/* טלפון */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#6B584C] flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#ADC178]" />
            מספר טלפון
            <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            placeholder="0500000000"
            dir="ltr"
            className={`w-full px-4 py-3 border rounded-lg text-[#464646] bg-white
              placeholder:text-[#464646]/40 focus:outline-none focus:ring-2
              transition-all duration-200
              ${phoneError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-[#e8e8e8] focus:ring-[#ADC178]/30 focus:border-[#ADC178]'
              }`}
          />
          {phoneError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500"
            >
              {phoneError}
            </motion.p>
          )}
          <p className="text-xs text-[#464646]/50 mt-0.5">
            נשלח אליך תזכורת SMS לפני הסדנה
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className="bg-[#ADC178] hover:bg-[#9ab569] text-white px-8 py-3 rounded-lg
                     transition-all duration-200 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'שומר...' : 'המשך לתשלום'}
        </Button>
      </div>
    </div>
  );
}
