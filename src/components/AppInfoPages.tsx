import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  MessageSquareHeart,
  Mail,
  Copy,
  Check,
  Sparkles,
  Lock,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { registerBackHandler } from '../utils/backButton';

export type AppInfoPageType = 'about' | 'privacy' | 'feedback';

interface AppInfoPagesProps {
  pageType: AppInfoPageType;
  onBack: () => void;
}

export const AppInfoPages: React.FC<AppInfoPagesProps> = ({ pageType, onBack }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const contactEmail = 'ahn.alim10@gmail.com';

  useEffect(() => {
    return registerBackHandler(() => {
      onBack();
      return true;
    });
  }, [onBack]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-b from-[#046c4e] via-[#03543f] to-[#022c22] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 px-4 py-3.5 bg-[#045d43]/95 backdrop-blur-md border-b border-emerald-400/25 flex items-center gap-3 shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition active:scale-95 cursor-pointer"
          title="ফিরে যান"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
            {pageType === 'about' && 'অ্যাপ সম্বন্ধে : হিসাব ৩৬০'}
            {pageType === 'privacy' && 'প্রাইভেসি পলিসি'}
            {pageType === 'feedback' && 'অভিযোগ ও পরামর্শ'}
          </h1>
          <p className="text-[11px] text-emerald-200">
            হিসাব ৩৬০ • আপনার আয়, ব্যয় ও সঞ্চয়ের স্মার্ট সঙ্গী
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* 1. ABOUT PAGE (অ্যাপ সম্বন্ধে) */}
        {pageType === 'about' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Brand Hero Card */}
            <div className="rounded-3xl bg-white/95 text-stone-900 p-5 shadow-xl border border-emerald-300/40 text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 p-1 bg-gradient-to-tr from-emerald-500 via-amber-300 to-emerald-600 shadow-lg">
                <img
                  src="/logo.jpg"
                  alt="হিসাব ৩৬০"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>অ্যাপ সম্বন্ধে : হিসাব ৩৬০</span>
              </div>
              <h2 className="text-lg font-extrabold text-emerald-900">
                আপনার ব্যক্তিগত আয়-ব্যয়ের নির্ভরযোগ্য সঙ্গী
              </h2>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed mt-2.5 text-left">
                <strong>হিসাব ৩৬০</strong> একটি ব্যক্তিগত হিসাব ব্যবস্থাপনা অ্যাপ। প্রতিদিনের আয়-ব্যয়, বাজারের ফর্দ, মাসিক বাজেট, আয়ের লক্ষ্য এবং দেনা-পাওনার হিসাব সহজে সংরক্ষণ ও পরিচালনা করার জন্য অ্যাপটি তৈরি করা হয়েছে।
              </p>
              <p className="text-xs sm:text-sm text-emerald-800 font-semibold leading-relaxed mt-2 text-left bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                আমাদের লক্ষ্য হলো দৈনন্দিন আর্থিক ব্যবস্থাপনাকে আরও সহজ, গোছানো ও কার্যকর করা।
              </p>
            </div>

            {/* Key Features Card */}
            <div className="rounded-3xl bg-white/95 text-stone-900 p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200 pb-2.5">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-emerald-900">
                  ✨ অ্যাপের প্রধান সুবিধাসমূহ
                </h3>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                  <h4 className="font-extrabold text-emerald-900 mb-1.5">১. আয়-ব্যয়ের হিসাব</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>প্রতিদিনের আয় ও ব্যয়ের তথ্য সংরক্ষণ।</li>
                    <li>আয়ের উৎস ও ব্যয়ের খাত অনুযায়ী হিসাব রাখা।</li>
                    <li>মোট আয়, মোট ব্যয় ও অবশিষ্ট টাকার হিসাব দেখা।</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <h4 className="font-extrabold text-amber-900 mb-1.5">২. বাজারের ফর্দ</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>বাজারের তালিকা তৈরি ও সংরক্ষণ।</li>
                    <li>পণ্যের নাম, পরিমাণ ও দাম অনুযায়ী হিসাব রাখা।</li>
                    <li>বাজারের মোট খরচ সহজে নির্ণয় করা।</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80">
                  <h4 className="font-extrabold text-purple-900 mb-1.5">৩. মাসিক বাজেট ও আয়ের লক্ষ্য</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>মাসিক খরচের বাজেট নির্ধারণ।</li>
                    <li>নির্ধারিত বাজেটের সঙ্গে প্রকৃত খরচ তুলনা।</li>
                    <li>ব্যক্তিগত আয়ের লক্ষ্য পরিকল্পনা ও অগ্রগতি পর্যবেক্ষণ।</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                  <h4 className="font-extrabold text-rose-900 mb-1.5">৪. দেনা-পাওনার হিসাব</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>কার কাছে টাকা পাবেন, তার হিসাব রাখা (স্বয়ংক্রিয়ভাবে আয়ে যুক্ত)।</li>
                    <li>কাকে কত টাকা দিতে হবে, তা সংরক্ষণ করা (স্বয়ংক্রিয়ভাবে ব্যয়ে যুক্ত)।</li>
                    <li>লেনদেনের ইতিহাস অনুসরণ করা।</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80">
                  <h4 className="font-extrabold text-sky-900 mb-1.5">৫. মাসিক হিসাব ও আর্কাইভ</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>নির্দিষ্ট সময়ের হিসাব গুছিয়ে রাখা।</li>
                    <li>পুরোনো হিসাব আর্কাইভ করে সংরক্ষণ করা।</li>
                    <li>প্রয়োজন অনুযায়ী আগের হিসাব খুঁজে দেখা।</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80">
                  <h4 className="font-extrabold text-teal-900 mb-1.5">৬. ডেটা ব্যাকআপ ও পুনরুদ্ধার</h4>
                  <ul className="space-y-1 text-stone-700 list-disc list-inside leading-relaxed">
                    <li>সমর্থিত সুবিধা ব্যবহার করে হিসাবের ব্যাকআপ ডাউনলোড করা।</li>
                    <li>ব্যাকআপ ফাইল থেকে সংরক্ষিত তথ্য পুনরায় রিস্টোর করা।</li>
                    <li>এক ক্লিকে আকর্ষণীয় পিডিএফ (PDF) ও এক্সেল রিপোর্ট ডাউনলোড করা।</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PRIVACY POLICY PAGE (প্রাইভেসি পলিসি) */}
        {pageType === 'privacy' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl bg-white/95 text-stone-900 p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-stone-900">
                    প্রাইভেসি পলিসি — হিসাব ৩৬০
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold">
                    সর্বশেষ হালনাগাদ: ২৮ অক্টোবর ২০২৬
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                <strong>হিসাব ৩৬০</strong> ব্যবহারকারীদের ব্যক্তিগত ও আর্থিক তথ্যের গোপনীয়তা রক্ষায় সম্পূর্ণ প্রতিশ্রুতিবদ্ধ। অ্যাপটি কীভাবে আপনার তথ্য সংরক্ষণ ও ব্যবহার করে, তা নিচে স্পষ্টভাবে তুলে ধরা হলো:
              </p>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <h3 className="font-extrabold text-emerald-900 flex items-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>১. তথ্য সংরক্ষণ ও লোকাল স্টোরেজ</span>
                  </h3>
                  <p className="text-stone-700 leading-relaxed">
                    আপনার প্রদত্ত সকল আয়-ব্যয়, বাজারের ফর্দ, বাজেট, দেনা-পাওনা, নাম ও স্বাক্ষর সরাসরি আপনার নিজস্ব ডিভাইসের লোকাল স্টোরেজে সংরক্ষিত থাকে। আমাদের কোনো বাহ্যিক সার্ভারে আপনার ব্যক্তিগত হিসাব স্বয়ংক্রিয়ভাবে আপলোড বা সংরক্ষণ করা হয় না।
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <h3 className="font-extrabold text-emerald-900 flex items-center gap-1.5 mb-1">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>২. তথ্য শেয়ারিং ও গোপনীয়তা</span>
                  </h3>
                  <p className="text-stone-700 leading-relaxed">
                    <strong>হিসাব ৩৬০</strong> কোনো তৃতীয় পক্ষ বা বিজ্ঞাপনী সংস্থার কাছে ব্যবহারকারীর কোনো তথ্য বিক্রি, হস্তান্তর বা শেয়ার করে না। আপনার আর্থিক তথ্যের একমাত্র নিয়ন্ত্রক আপনি নিজেই।
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <h3 className="font-extrabold text-emerald-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>৩. ব্যাকআপ, ফাইল ও মিডিয়া ব্যবহার</span>
                  </h3>
                  <p className="text-stone-700 leading-relaxed">
                    প্রোফাইল ছবি, ডিজিটাল স্বাক্ষর যুক্ত করা এবং ডাটা ব্যাকআপ (.json) বা পিডিএফ রিপোর্ট ডাউনলোড ও রিস্টোর করার জন্য কেবল আপনার নির্দেশেই ডিভাইসের ফাইল ব্যবহৃত হয়। ব্যাকআপ ফাইল নিরাপদ স্থানে সংরক্ষণের দায়িত্ব ব্যবহারকারীর।
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <h3 className="font-extrabold text-emerald-900 mb-1">
                    ৪. তথ্য মুছে ফেলার অধিকার
                  </h3>
                  <p className="text-stone-700 leading-relaxed">
                    আপনি যেকোনো সময় অ্যাপের প্রোফাইল অংশ থেকে <strong>"সকল ডাটা মুছে ফেলুন"</strong> অপশন ব্যবহার করে আপনার সংরক্ষিত সকল হিসাব স্থায়ীভাবে মুছে ফেলতে পারবেন।
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <h3 className="font-extrabold text-emerald-900 mb-1">
                    ৫. যোগাযোগ
                  </h3>
                  <p className="text-stone-700 leading-relaxed">
                    এই প্রাইভেসি পলিসি সম্পর্কে আপনার কোনো প্রশ্ন বা জিজ্ঞাসা থাকলে আমাদের ইমেইল করুন:{' '}
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-bold text-emerald-700 underline"
                    >
                      {contactEmail}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. FEEDBACK & SUGGESTIONS PAGE (অভিযোগ ও পরামর্শ) */}
        {pageType === 'feedback' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl bg-white/95 text-stone-900 p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-stone-900">
                    অভিযোগ ও পরামর্শ
                  </h2>
                  <p className="text-xs text-stone-500 font-semibold">
                    আপনার মতামত হিসাব ৩৬০-কে আরও উন্নত করে
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                <strong>হিসাব ৩৬০</strong> ব্যবহার করার সময় আপনার যেকোনো অভিজ্ঞতা, নতুন সুবিধার প্রস্তাব, পরামর্শ কিংবা কারিগরি সমস্যার কথা আমরা অত্যন্ত গুরুত্বের সাথে গ্রহণ করি। আপনার মূল্যবান মতামত আমাদের অ্যাপটিকে আরও নিখুঁত ও ব্যবহারবান্ধব করতে সাহায্য করবে।
              </p>

              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2 text-xs sm:text-sm">
                <h3 className="font-extrabold text-purple-900">
                  যেসব বিষয়ে আমাদের জানাতে পারেন:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-stone-700 leading-relaxed">
                  <li>অ্যাপ ব্যবহারে কোনো ত্রুটি বা সমস্যার সম্মুখীন হলে।</li>
                  <li>হিসাব বা রিপোর্টে নতুন কোনো ফিচার যুক্ত করার পরামর্শ থাকলে।</li>
                  <li>ডিজাইন বা ভাষাগত কোনো উন্নয়নের মতামত থাকলে।</li>
                </ul>
              </div>

              {/* Direct Email Contact Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-emerald-800">
                      ইমেইলের মাধ্যমে সরাসরি যোগাযোগ করুন
                    </div>
                    <div className="font-extrabold text-sm sm:text-base text-stone-900 select-all">
                      {contactEmail}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>ইমেইল কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-emerald-600" />
                        <span>ইমেইল কপি করুন</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent('হিসাব ৩৬০ - অভিযোগ ও পরামর্শ')}`}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>ইমেইল পাঠান</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
