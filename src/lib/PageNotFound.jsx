// Page Not Found - Simplified version without BASE44
import React from 'react';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4" dir="rtl">
            <h1 className="text-4xl font-bold text-[#6B584C] mb-4">404</h1>
            <p className="text-lg text-[#464646] mb-6">הדף לא נמצא</p>
            <Link
                to="/"
                className="px-6 py-3 bg-[#ADC178] text-white rounded-lg hover:bg-[#9ab569] transition-colors"
            >
                חזרה לדף הראשי
            </Link>
        </div>
    );
}