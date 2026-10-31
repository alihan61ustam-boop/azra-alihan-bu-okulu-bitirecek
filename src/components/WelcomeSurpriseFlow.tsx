"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import {
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Video,
  MessageSquareText,
  Globe,
  KeyRound,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

type FlowStep = "question" | "thanks" | "tutorial";

interface TutorialSlide {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    badge: "Adım 1 / 5 • Ders Odaları",
    title: "Her Fizik Dersi İçin İzole Çalışma Alanı",
    description:
      "Sol menüde Klasik Mekanik, Elektromanyetizma, Kuantum Fiziği ve Termodinamik gibi derslerin birbirinden tamamen bağımsız odaları bulunur. İstediğin an yeni ders ekleyebilir ve müfredatını tanımlayabilirsin.",
    highlights: [
      "Dersler birbirinin notlarını ve formüllerini asla karıştırmaz",
      "Tek tıkla yeni ders ekleme ve ders müfredatı düzenleme",
      "Göz yormayan saf siyah (#09090b) minimalist odak tasarımı",
    ],
    icon: <BookOpen className="h-6 w-6 text-amber-400" />,
  },
  {
    badge: "Adım 2 / 5 • Multimodal Ders İşleyici",
    title: "Ders Videolarından Dakika Dakika Özet & Tahta Formülleri",
    description:
      "Online ders kayıtlarını (MP4, WebM, MP3, WAV) yüklediğinde Gemini videoyu hem izler hem dinler; tahtadaki denklemleri LaTeX formatına çevirir ve tıklanabilir zaman damgaları oluşturur.",
    highlights: [
      "Tıklanabilir [11:45] zaman damgalarıyla videoda tam o saniyeye atlama",
      "Tahtadaki tüm fizik formüllerinin KaTeX ile kitap kalitesinde gösterimi",
      "Hocanın 'Bu kısım sınavda çıkabilir / sakın unutmayın' dediği anlar için özel Sınav Uyarısı rozetleri",
    ],
    icon: <Video className="h-6 w-6 text-amber-400" />,
  },
  {
    badge: "Adım 3 / 5 • Derse Özel AI Eğitmen",
    title: "Bölünmüş Ekranda 7/24 Özel Fizik Asistanın",
    description:
      "Sol tarafta ders notlarını ve formülleri incelerken, sağ taraftaki sohbet panelinde yalnızca o dersin içeriğine hakim AI Eğitmeninle çalışabilirsin.",
    highlights: [
      "Anlamadığın türetmeleri adım adım sadeleştirerek anlatır",
      "Defterindeki veya ödevindeki sorunun fotoğrafını yükleyip çözdürebilirsin",
      "Hocanın vurguladığı yerlerden sana özel Vize / Final sınav provası yapar",
    ],
    icon: <MessageSquareText className="h-6 w-6 text-amber-400" />,
  },
  {
    badge: "Adım 4 / 5 • Online Akademik Kaynaklar",
    title: "Açık Kaynak Ders Notları ve Makale Tarayıcı",
    description:
      "'Online Kaynak Çek' sekmesinden ArXiv fizik makalelerini, Wikipedia akademik özetlerini ve Gemini destekli çözümlü çalışma sorularını tek tıkla ders odana aktarabilirsin.",
    highlights: [
      "ArXiv, Wikipedia ve CrossRef üzerinden canlı akademik tarama",
      "Bulduğun kaynağı tek tıkla dersin bilgi bankasına kaydetme",
      "Kendi ders notu dosyalarını (.txt / .md) doğrudan odaya yükleme",
    ],
    icon: <Globe className="h-6 w-6 text-amber-400" />,
  },
  {
    badge: "Adım 5 / 5 • API & Araç Merkezi",
    title: "Kendi Gemini API Anahtarın ve Esnek Araç Sistemi",
    description:
      "Sağ üstteki 'API & Araçlar' butonundan Gemini API anahtarını şifreli olarak kaydedebilir, canlı doğrulama yapabilir ve harici akademik servisleri yönetebilirsin.",
    highlights: [
      "Hazır örnek fizik dersleri, LaTeX formüller ve sınav soruları şu an yüklü!",
      "Gemini API anahtarını girdiğin an canlı video analizi ve AI sohbet devreye girer",
      "Üst menüdeki 'Alihan'ın Notu' butonuyla bu sürprizi istediğin an tekrar açabilirsin",
    ],
    icon: <KeyRound className="h-6 w-6 text-amber-400" />,
  },
];

export function WelcomeSurpriseFlow({
  isOpen,
  initialStep = "question",
  onComplete,
}: {
  isOpen: boolean;
  initialStep?: FlowStep;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [selectedChoice, setSelectedChoice] = useState<"A" | "B" | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  // Sync step if reopened explicitly for tutorial or full surprise
  React.useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setSlideIdx(0);
    }
  }, [isOpen, initialStep]);

  if (!isOpen) return null;

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const photoSrc = `${basePath}/azra-alihan.png`;

  const handleAnswer = (choice: "A" | "B") => {
    setSelectedChoice(choice);
    setStep("thanks");
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.62 },
        colors: ["#fb7185", "#f59e0b", "#fde047", "#ffffff"],
      });
    } catch {
      // ignore if reduced motion
    }
  };

  const currentSlide = TUTORIAL_SLIDES[slideIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      {/* STEP 1: ROMANTIC QUESTION POP-UP WITH PHOTO */}
      {step === "question" && (
        <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-rose-950/20 animate-in fade-in zoom-in-95 duration-300">
          {/* Top ambient glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-rose-500/15 blur-3xl" />

          {/* Header Pill */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold tracking-wide text-zinc-200">
                Azra&amp;Alihan Bu Okulu Bitirecek
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
              <Heart className="h-3 w-3 fill-rose-400 text-rose-400" /> Özel Giriş
            </span>
          </div>

          {/* Uploaded Photo Frame */}
          <div className="px-5 pt-5">
            <div className="relative mx-auto overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
              <img
                src={photoSrc}
                alt="Azra ve Alihan"
                className="mx-auto max-h-72 sm:max-h-80 w-full object-contain bg-zinc-950"
              />
            </div>
          </div>

          {/* Message & Question */}
          <div className="p-5 sm:p-6 space-y-5">
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 text-center space-y-3">
              <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-200">
                Canım benim sen ne kadar kötü olursan ol senin için çalışacak her
                zaman bir <span className="font-semibold text-rose-300">Alihan</span>{" "}
                bir <span className="font-semibold text-amber-300">Gemini</span> var
                şimdi senin için yaptığım bu siteyi görmek için soruya yanıt ver.
              </p>
              <p className="text-base sm:text-lg font-bold text-white pt-1">
                Senin için ne kadar değerliyim ?
              </p>
            </div>

            {/* Choice Buttons A & B */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleAnswer("A")}
                className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3.5 text-left transition-all hover:border-rose-500/50 hover:bg-rose-500/10 active:scale-[0.99] cursor-pointer"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 font-mono text-xs font-bold text-rose-300 group-hover:border-rose-400/50">
                  A)
                </span>
                <span className="text-sm font-medium text-zinc-100 group-hover:text-white">
                  Tahmin bile edemeyeceğin kadar çok
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAnswer("B")}
                className="group flex w-full items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-left transition-all hover:border-rose-400 hover:bg-rose-500/20 active:scale-[0.99] cursor-pointer"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-400/40 bg-zinc-950 font-mono text-xs font-bold text-rose-300">
                  B)
                </span>
                <span className="text-sm font-semibold text-white">
                  A şıkkı + Daha çok çok
                </span>
                <Sparkles className="ml-auto h-4 w-4 text-rose-300 opacity-80 group-hover:opacity-100" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: THANK YOU POP-UP */}
      {step === "thanks" && (
        <div className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-rose-500/20 blur-3xl" />

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
            <Heart className="h-8 w-8 fill-rose-400 text-rose-400 animate-pulse" />
          </div>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">
            <span>Seçimin:</span>
            <span className="font-semibold text-rose-300">
              {selectedChoice === "B"
                ? "B) A şıkkı + Daha çok çok"
                : "A) Tahmin bile edemeyeceğin kadar çok"}
            </span>
          </div>

          <p className="text-base sm:text-lg font-medium leading-relaxed text-zinc-100 my-4">
            teşekkür ederim bende öyle düşünüyordum şimdi kendi web sitenin tadını
            çıkarta bilirsinn :)
          </p>

          <button
            type="button"
            onClick={() => setStep("tutorial")}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 active:scale-[0.99] cursor-pointer"
          >
            <span>Devam Et</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STEP 3: INTERACTIVE MINI TUTORIAL */}
      {step === "tutorial" && (
        <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
                <GraduationCap className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Hızlı Başlangıç Rehberi
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Sitenin tüm özelliklerini 30 saniyede tanı
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="rounded-lg border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 cursor-pointer"
            >
              Rehberi Geç
            </button>
          </div>

          {/* Slide Body */}
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-medium text-amber-300">
                {currentSlide.badge}
              </span>
              <div className="flex items-center gap-1.5">
                {TUTORIAL_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSlideIdx(idx)}
                    aria-label={`Adım ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === slideIdx
                        ? "w-6 bg-amber-400"
                        : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                {currentSlide.icon}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {currentSlide.title}
                </h4>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {currentSlide.description}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-4 space-y-2.5">
              {currentSlide.highlights.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={slideIdx === 0}
                onClick={() => setSlideIdx((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Önceki</span>
              </button>

              {slideIdx < TUTORIAL_SLIDES.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setSlideIdx((p) => p + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 cursor-pointer"
                >
                  <span>Sonraki Özellik</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 cursor-pointer"
                >
                  <span>Bu Okulu Bitirmeye Başla!</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
