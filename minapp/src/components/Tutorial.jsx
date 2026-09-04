import React, { useState } from 'react';
import { useStore } from '../store';

const STEPS = [
  { emoji: '🥤', title: 'اولین نوشابه خودت را تولید کن!', text: 'به بخش «تولید» برو، فرمول Classic Cola را انتخاب کن و خط تولید را روشن کن. مواد اولیه‌ی اولیه رایگان داری!' },
  { emoji: '📦', title: 'محصول را دریافت کن', text: 'بعد از پایان زمان تولید، نوشابه‌ها به انبارت اضافه می‌شوند. حتی اگر از بازی خارج شوی، تولید در سرور ادامه دارد!' },
  { emoji: '💰', title: 'آن را بفروش', text: 'در «بازار» نوشابه‌هایت را بفروش و کوین بساز. قیمت‌ها مدام تغییر می‌کنند — زمان خوب برای فروش را پیدا کن!' },
  { emoji: '🏭', title: 'اولین Upgrade را انجام بده', text: 'با کوین‌هایت ماشین‌های کارخانه را ارتقا بده: کیفیت بهتر، سرعت بیشتر، سود بیشتر!' },
  { emoji: '🌎', title: 'اولین بازار را باز کن', text: 'در Level 5 شهر «دبی» باز می‌شود. نوشابه را با قیمت بالاتر به شهرهای دیگر بفرست و امپراتوری‌ات را گسترش بده!' },
];

export default function Tutorial({ open }) {
  const [step, setStep] = useState(0);
  const finishTutorial = useStore((s) => s.finishTutorial);

  if (!open) return null;
  const s = STEPS[step];

  return (
    <div className="tutorial-overlay">
      <button className="tut-skip" onClick={finishTutorial}>رد کردن ⏭</button>
      <div className="tut-emoji">{s.emoji}</div>
      <div className="tut-dots">
        {STEPS.map((_, i) => <span key={i} className={`tut-dot ${i === step ? 'active' : ''}`} />)}
      </div>
      <div className="tut-title">{s.title}</div>
      <div className="tut-text">{s.text}</div>
      <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 40px' }}
        onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finishTutorial())}>
        {step < STEPS.length - 1 ? 'ادامه →' : '🚀 شروع کن!'}
      </button>
    </div>
  );
}
