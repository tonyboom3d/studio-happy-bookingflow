import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function ConsultationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    message: '',
    marketing_consent: false
  });
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // העלאת קבצים אם יש
    let attachments = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      attachments.push(file_url);
    }
    
    // שמירת הבקשה
    await base44.entities.ConsultationRequest.create({
      ...formData,
      attachments,
      request_type: 'consultation',
      status: 'new'
    });
    
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      message: '',
      marketing_consent: false
    });
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#ADC178] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#6B584C] mb-2">קיבלנו את הפנייה שלך!</h3>
              <p className="text-[#464646] mb-6">עושים מאמץ לענות לך בהקדם האפשרי</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleClose}>
                  סגירת חלון
                </Button>
                <Button 
                  className="bg-[#ADC178] hover:bg-[#9ab569]"
                  onClick={handleClose}
                >
                  חזרה להזמנה
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <DialogHeader>
                <DialogTitle className="text-[#6B584C]">אשמח להתייעץ</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4" dir="rtl">
                <div>
                  <Label htmlFor="full_name">שם מלא *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">טלפון *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                    className="mt-1"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">אימייל *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="mt-1"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">מה תרצה להתייעץ? *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label>העלאת תמונות/סרטון (אופציונלי)</Label>
                  <div className="mt-1">
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#e8e8e8] rounded-lg cursor-pointer hover:border-[#ADC178] transition-colors">
                      <Upload className="w-5 h-5 text-[#464646]" />
                      <span className="text-sm text-[#464646]">
                        {files.length > 0 ? `${files.length} קבצים נבחרו` : 'לחץ לבחירת קבצים'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="marketing"
                    checked={formData.marketing_consent}
                    onCheckedChange={(checked) => setFormData({...formData, marketing_consent: checked})}
                  />
                  <Label htmlFor="marketing" className="text-sm font-normal">
                    אני מאשר/ת קבלת עדכונים ודיוור
                  </Label>
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#ADC178] hover:bg-[#9ab569]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      שולח...
                    </>
                  ) : 'שליחה'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}