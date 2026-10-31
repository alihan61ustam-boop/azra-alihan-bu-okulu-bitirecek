import {
  Course,
  Lecture,
  CourseResource,
  ChatMessage,
} from "@/types/academic";

export const INITIAL_COURSES: Course[] = [
  {
    id: "course-klasik-mekanik",
    code: "FİZ 201",
    title: "Klasik Mekanik",
    professor: "Prof. Dr. Kerem Aydın",
    semester: "Güz Dönemi",
    description:
      "Genelleştirilmiş koordinatlar, D'Alembert ilkesi, Lagrange ve Hamilton mekaniği, merkezcil kuvvet hareketi ve katı cisim dinamiği.",
    syllabus:
      "1. Hafta: Bağ Koşulları ve Genelleştirilmiş Koordinatlar\n2. Hafta: Hamilton İlkesi ve Euler-Lagrange Denklemleri\n3. Hafta: Korunum Yasaları ve Noether Teoremi\n4. Hafta: İki Cisim Problemi ve Kepler Yörüngeleri\n5. Hafta: Küçük Salınımlar ve Normal Modlar\n6. Hafta: Hamilton Denklemleri ve Faz Uzayı",
    iconName: "Orbit",
    createdAt: "2026-10-01T09:00:00Z",
  },
  {
    id: "course-elektromanyetizma",
    code: "FİZ 202",
    title: "Elektromanyetizma",
    professor: "Prof. Dr. Selin Aksoy",
    semester: "Güz Dönemi",
    description:
      "Elektrostatik, Gauss yasası, sınır değer problemleri, manyetostatik, Faraday indüksiyon yasası ve Maxwell denklemlerinden elektromanyetik dalgalara geçiş.",
    syllabus:
      "1. Hafta: Vektör Analizi, Diverjans ve Stokes Teoremleri\n2. Hafta: Coulomb Yasası ve Gauss Yasası Uygulamaları\n3. Hafta: Laplace ve Poisson Denklemleri\n4. Hafta: Biot-Savart ve Ampère Yasaları\n5. Hafta: Faraday Yasası, Yer Değiştirme Akımı ve Maxwell Denklemleri\n6. Hafta: Vakumda ve Yalıtkanlarda Elektromanyetik Dalgalar",
    iconName: "Zap",
    createdAt: "2026-10-01T09:05:00Z",
  },
  {
    id: "course-kuantum-fizigi",
    code: "FİZ 301",
    title: "Kuantum Fiziği",
    professor: "Doç. Dr. Emre Karahan",
    semester: "Güz Dönemi",
    description:
      "Dalga fonksiyonu ve istatistiksel yorum, zamana bağlı ve zamandan bağımsız Schrödinger denklemi, Hilbert uzayı, operatörler, potansiyel kuyuları ve kuantum tünelleme.",
    syllabus:
      "1. Hafta: Kara Cisim Işıması, Fotoelektrik Olay ve De Broglie Hipotezi\n2. Hafta: Dalga Fonksiyonu, Normalizasyon ve Beklenen Değerler\n3. Hafta: Schrödinger Denklemi ve Durağan Durumlar\n4. Hafta: Sonsuz Potansiyel Kuyusu ve Harmonik Salınıcı (Merdiven Operatörleri)\n5. Hafta: Sonlu Potansiyel Engeli ve Tünelleme\n6. Hafta: Komütatörler ve Heisenberg Belirsizlik İlkesi",
    iconName: "Atom",
    createdAt: "2026-10-01T09:10:00Z",
  },
  {
    id: "course-termodinamik",
    code: "FİZ 204",
    title: "Termodinamik ve İstatistiksel Fizik",
    professor: "Prof. Dr. Deniz Yılmaz",
    semester: "Güz Dönemi",
    description:
      "Termodinamik yasaları, tersinir/tersinmez süreçler, Carnot ısı makinesi, entropi, termodinamik potansiyeller (U, H, F, G) ve Maxwell bağıntıları.",
    syllabus:
      "1. Hafta: Termodinamiğin Sıfırıncı Yasası ve Hal Denklemleri\n2. Hafta: İş, Isı, İç Enerji ve Birinci Yasa\n3. Hafta: İdeal Gazların Adyabatik ve İzotermal Süreçleri\n4. Hafta: İkinci Yasa, Carnot Çevrimi ve Clausius Eşitsizliği\n5. Hafta: Entropi Değişimi Hesaplamaları\n6. Hafta: Helmholtz & Gibbs Serbest Enerjileri ve Maxwell Bağıntıları",
    iconName: "Flame",
    createdAt: "2026-10-01T09:15:00Z",
  },
];

export const INITIAL_LECTURES: Lecture[] = [
  {
    id: "lec-lagrange-01",
    courseId: "course-klasik-mekanik",
    title: "Ders 04: Lagrange Fonksiyonu, Euler-Lagrange Denklemleri ve Atwood Aleti",
    recordedDate: "28 Ekim 2026",
    sourceType: "sample",
    durationLabel: "48:20",
    executiveSummary:
      "Bu derste Newton mekaniğindeki vektörel bağ kuvvetlerini (ip gerilmesi, yüzey tepki kuvveti) açıkça çözme zorunluluğunu ortadan kaldıran analitik Lagrange formülasyonu işlenmiştir. Genelleştirilmiş koordinatlar ($q_i$) tanımlanmış, Hamilton'ın En Küçük Etki İlkesi ($\\delta S = 0$) üzerinden Euler-Lagrange diferansiyel denklemleri türetilmiş ve klasik düzlemsel sarkaç ile sürtünmesiz makaralı Atwood düzeneği üzerinde adım adım uygulanmıştır.",
    timeline: [
      {
        id: "seg-km-1",
        timestamp: "00:00",
        seconds: 0,
        title: "Newton Mekaniğinin Sınırları ve Bağ Koşulları",
        summary:
          "Karmaşık mekanik sistemlerde ip gerilmesi ve normal kuvvet gibi bağ kuvvetlerinin hesabı zorlaştırdığı vurgulanarak holonomik bağ koşulları tanımlandı.",
        spokenTranscript:
          "Arkadaşlar hoş geldiniz. Şimdiye kadar F = ma ile her kuvveti vektörel olarak bileşenlerine ayırdık. Ama küresel yüzeyde kayan bir boncuk düşündüğünüzde tepki kuvvetini önceden bilmiyoruz. İşte bugün skaler enerjiler üzerinden çalışan Lagrange mekaniğine geçiyoruz.",
        equations: ["f(r_1, r_2, \\dots, r_N, t) = 0"],
        isExamAlert: false,
      },
      {
        id: "seg-km-2",
        timestamp: "11:45",
        seconds: 705,
        title: "Lagrange Fonksiyonu (L = T - V) ve Etki İntegrali",
        summary:
          "Kinetik enerji $T$ ile potansiyel enerji $V$ arasındaki fark olarak tanımlanan Lagrangian ve $t_1, t_2$ arasındaki etki integrali $S$ tahtaya yazıldı.",
        spokenTranscript:
          "Dikkat edin, toplam enerji T artı V'dir ama Lagrangian L eşittir T eksi V olarak tanımlanır! Sakın işaret hatası yapmayın; sınav kağıtlarında en çok T + V yazıldığı için puan kırıyorum.",
        equations: [
          "L(q_i, \\dot{q}_i, t) = T - V",
          "S = \\int_{t_1}^{t_2} L(q_i, \\dot{q}_i, t)\\,dt",
        ],
        isExamAlert: true,
        professorQuote:
          "Sakın işaret hatası yapmayın! Lagrangian T + V değil, T - V'dir. Sınavda ilk kontrol ettiğim satır budur.",
      },
      {
        id: "seg-km-3",
        timestamp: "23:10",
        seconds: 1390,
        title: "Euler-Lagrange Denklemlerinin Varyasyonel Türetilişi",
        summary:
          "$\delta S = 0$ koşulundan kısmi integrasyon yapılarak her bağımsız genelleştirilmiş koordinat $q_i$ için hareket denklemi elde edildi.",
        spokenTranscript:
          "Uç noktalarda varyasyon sıfır olduğu için sınır terimi düşer ve içerideki parantez sıfıra eşit olmak zorundadır. Bu kısım sınavda çıkabilir arkadaşlar, hem türetilişini hem de döngüsel koordinatlarda genelleştirilmiş momentumun korunduğunu adınız gibi bilin.",
        equations: [
          "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) - \\frac{\\partial L}{\\partial q_i} = 0",
          "p_i = \\frac{\\partial L}{\\partial \\dot{q}_i}",
        ],
        isExamAlert: true,
        professorQuote:
          "Bu kısım sınavda çıkabilir: Döngüsel koordinat varsa (L içinde q açıkça yoksa) ilgili kanonik momentum korunur!",
      },
      {
        id: "seg-km-4",
        timestamp: "36:40",
        seconds: 2200,
        title: "Örnek Çözüm: Basit Sarkaç ve Kütlesi İhmal Edilmeyen Makara",
        summary:
          "Tek serbestlik dereceli basit sarkacın açısal hareket denklemi ve $I$ eylemsizlik momentli makaraya sahip Atwood aletinin ivmesi sadece enerji terimleriyle çözüldü.",
        spokenTranscript:
          "Gördüğünüz gibi ip gerilmesi T'yi hiç yazmadan tek bir türevle ivmeyi bulduk. Makaranın dönme kinetik enerjisini 1/2 I omega kare olarak T'ye eklemeyi unutmuyoruz.",
        equations: [
          "L = \\frac{1}{2}ml^2\\dot{\\theta}^2 + mgl\\cos\\theta \\implies \\ddot{\\theta} + \\frac{g}{l}\\sin\\theta = 0",
          "a = \\frac{(m_1 - m_2)g}{m_1 + m_2 + I/R^2}",
        ],
        isExamAlert: true,
        professorQuote:
          "Vizede makaranın kütlesini sıfır vermeyeceğim; dönme kinetik enerjisini T içine eklemeyi sakın unutmayın!",
      },
    ],
    whiteboardExtractions: [
      {
        id: "wb-km-1",
        timestamp: "12:10",
        seconds: 730,
        title: "Hamilton'ın En Küçük Etki İlkesi",
        latex: "\\delta S = \\delta \\int_{t_1}^{t_2} L(q_1, \\dots, q_n, \\dot{q}_1, \\dots, \\dot{q}_n, t)\\,dt = 0",
        variablesExplanation:
          "$S$: Etki (Action, J·s), $L = T - V$: Lagrange fonksiyonu, $q_i$: $i$. genelleştirilmiş koordinat, $\\dot{q}_i$: genelleştirilmiş hız.",
        diagramNote:
          "Tahta Diyagramı: $(q, t)$ uzayında sabit $(q(t_1), t_1)$ ve $(q(t_2), t_2)$ uç noktalarını birleştiren gerçek yörünge ile $q(t) + \\epsilon\\eta(t)$ komşu yörüngesinin çizimi.",
      },
      {
        id: "wb-km-2",
        timestamp: "24:05",
        seconds: 1445,
        title: "Euler-Lagrange Hareket Denklemi ve Kanonik Momentum",
        latex: "\\frac{d}{dt}\\left(\\frac{\\partial L}{\\partial \\dot{q}_i}\\right) - \\frac{\\partial L}{\\partial q_i} = 0, \\qquad p_i \\equiv \\frac{\\partial L}{\\partial \\dot{q}_i}",
        variablesExplanation:
          "Eğer $\\frac{\\partial L}{\\partial q_i} = 0$ ise $q_i$ döngüsel (ignorable) koordinattır ve $\\dot{p}_i = 0$ olduğundan $p_i = \\text{sabit}$ kalır.",
      },
      {
        id: "wb-km-3",
        timestamp: "39:15",
        seconds: 2355,
        title: "Eylemsizlik Momentli Atwood Aleti Lagrangian'ı",
        latex: "L = \\frac{1}{2}(m_1 + m_2 + \\frac{I}{R^2})\\dot{x}^2 + (m_1 - m_2)gx",
        variablesExplanation:
          "$x$: $m_1$ kütlesinin aşağı yönlü yer değiştirmesi, $R$: makara yarıçapı, $I$: makara eylemsizlik momenti, $\\omega = \\dot{x}/R$: kaymadan dönme koşulu.",
      },
    ],
    examAlerts: [
      {
        id: "ea-km-1",
        timestamp: "11:45",
        seconds: 705,
        severity: "critical",
        topic: "Lagrange İşaret Kuralı ve Potansiyel Referansı",
        professorQuote:
          "Sakın işaret hatası yapmayın! Lagrangian T + V değil, T - V'dir. Koordinat eksenini aşağı pozitif seçtiyseniz V = -mgx olur, eksi eksiden L içinde +mgx gelir!",
        examTip:
          "Soru çözümüne başlarken referans potansiyel enerji düzlemini ($V=0$) şekil üzerinde mutlaka açıkça çizerek göster.",
      },
      {
        id: "ea-km-2",
        timestamp: "23:10",
        seconds: 1390,
        severity: "critical",
        topic: "Döngüsel Koordinatlar ve Korunum Yasaları",
        professorQuote:
          "Bu kısım sınavda çıkabilir: Lagrangian'ı yazdıktan sonra hangi koordinatların döngüsel olduğunu ve hangi fiziksel büyüklüğün (açısal momentum veya doğrusal momentum) korunduğunu yorumlamanızı isteyeceğim.",
        examTip:
          "Polar koordinatlarda $\\phi$ açısı $L$ içinde açıkça yer almıyorsa $p_\\phi = \\frac{\\partial L}{\\partial \\dot{\\phi}} = mr^2\\dot{\\phi} = \\ell$ açısal momentumu korunur.",
      },
      {
        id: "ea-km-3",
        timestamp: "36:40",
        seconds: 2200,
        severity: "important",
        topic: "Makara ve Yuvarlanan Cisimlerde Dönme Kinetik Enerjisi",
        professorQuote:
          "Vizede makaranın kütlesini sıfır vermeyeceğim; dönme kinetik enerjisini T içine eklemeyi sakın unutmayın!",
        examTip:
          "Kaymadan yuvarlanma veya iple dönen makara varsa $T_{\\text{toplam}} = T_{\\text{öteleme}} + \\frac{1}{2}I\\omega^2$ yaz ve $\\omega = \\dot{x}/R$ bağ koşulunu türev almadan ÖNCE yerine koy.",
      },
    ],
    conceptMap: [
      {
        id: "cm-km-1",
        concept: "Holonomik Bağ Koşulları",
        formula: "n = 3N - k",
        description: "$N$ parçacıklı sistemde $k$ bağımsız denklem serbestlik derecesini $n$'ye indirir.",
        connectsTo: "Genelleştirilmiş Koordinatlar (q_i)",
      },
      {
        id: "cm-km-2",
        concept: "Lagrange Fonksiyonu",
        formula: "L = T - V",
        description: "Bağ kuvvetlerini içermeyen skaler enerji farkı fonksiyonu.",
        connectsTo: "Hamilton İlkesi (δS = 0)",
      },
      {
        id: "cm-km-3",
        concept: "Euler-Lagrange Denklemi",
        formula: "\\frac{d}{dt}(\\partial_{\\dot{q}} L) - \\partial_q L = 0",
        description: "Her serbestlik derecesi için ikinci mertebeden diferansiyel hareket denklemi üretir.",
        connectsTo: "Döngüsel Koordinatlar & Korunum",
      },
    ],
    practiceQuestions: [
      {
        id: "pq-km-1",
        difficulty: "Vize",
        question:
          "Yatay doğrultuda sürtünmesiz bir ray üzerinde serbestçe kayabilen $M$ kütleli bir bloğa, $l$ uzunluğunda kütlesiz bir çubukla $m$ kütleli bir sarkaç bağlıdır. Sistemin serbestlik derecesini belirleyiniz ve Lagrange fonksiyonunu ($L$) çıkarınız.",
        hint: "Bloğun yatay konumuna $x$, sarkacın düşeyle yaptığı açıya $\\theta$ deyin. $m$ kütlesinin Kartezyen koordinatlarını $(x_m, y_m)$ yazıp zamana göre türev alarak hız karesini bulun!",
        solutionMarkdown:
          "**1. Serbestlik Derecesi ve Koordinatlar:**\nSistem 2 serbestlik derecesine sahiptir: $q_1 = x$ ve $q_2 = \\theta$.\n\nSarkaç kütlesinin konum bileşenleri:\n$$x_m = x + l\\sin\\theta, \\qquad y_m = -l\\cos\\theta$$\n\nZamana göre türevleri:\n$$\\dot{x}_m = \\dot{x} + l\\dot{\\theta}\\cos\\theta, \\qquad \\dot{y}_m = l\\dot{\\theta}\\sin\\theta$$\n\n**2. Kinetik ve Potansiyel Enerji:**\n$$T = \\frac{1}{2}M\\dot{x}^2 + \\frac{1}{2}m(\\dot{x}_m^2 + \\dot{y}_m^2) = \\frac{1}{2}(M+m)\\dot{x}^2 + \\frac{1}{2}ml^2\\dot{\\theta}^2 + ml\\dot{x}\\dot{\\theta}\\cos\\theta$$\n$$V = -mgl\\cos\\theta$$\n\n**3. Lagrangian ($L = T - V$):**\n$$L(x, \\theta, \\dot{x}, \\dot{\\theta}) = \\frac{1}{2}(M+m)\\dot{x}^2 + \\frac{1}{2}ml^2\\dot{\\theta}^2 + ml\\dot{x}\\dot{\\theta}\\cos\\theta + mgl\\cos\\theta$$\n*(Dikkat: $x$ koordinatı $L$ içinde açıkça yer almadığından yatay kanonik momentum $p_x = (M+m)\\dot{x} + ml\\dot{\\theta}\\cos\\theta$ korunur!)*",
      },
      {
        id: "pq-km-2",
        difficulty: "Final",
        question:
          "Tepe açısı $2\\alpha$ olan düşey eksenli sürtünmesiz bir koninin iç yüzeyinde hareket eden $m$ kütleli bir parçacığın silindirik koordinatlarda hareket denklemlerini ve korunumlu büyüklüklerini bulunuz.",
        hint: "Koni yüzeyinin bağ denklemi $z = r\\cot\\alpha$ şeklindedir. $\\dot{z} = \\dot{r}\\cot\\alpha$ yazarak serbestlik derecesini $(r, \\phi)$ ikilisine indirin.",
        solutionMarkdown:
          "**Çözüm:**\nSilindirik koordinatlarda hız karesi $v^2 = \\dot{r}^2 + r^2\\dot{\\phi}^2 + \\dot{z}^2$ ve bağ koşulu $z = r\\cot\\alpha \\implies \\dot{z} = \\dot{r}\\cot\\alpha$ olduğundan:\n$$T = \\frac{1}{2}m\\left(\\dot{r}^2(1 + \\cot^2\\alpha) + r^2\\dot{\\phi}^2\\right) = \\frac{1}{2}m\\left(\\frac{\\dot{r}^2}{\\sin^2\\alpha} + r^2\\dot{\\phi}^2\\right)$$\n$$V = mgz = mgr\\cot\\alpha$$\n\nLagrangian:\n$$L = \\frac{1}{2}m\\frac{\\dot{r}^2}{\\sin^2\\alpha} + \\frac{1}{2}mr^2\\dot{\\phi}^2 - mgr\\cot\\alpha$$\n\n$\\phi$ döngüsel olduğundan $p_\\phi = mr^2\\dot{\\phi} = \\ell = \\text{sabit}$ ve radyal denklem:\n$$\\frac{m}{\\sin^2\\alpha}\\ddot{r} - \\frac{\\ell^2}{mr^3} + mg\\cot\\alpha = 0$$",
      },
    ],
    transcript: [
      {
        id: "tr-km-1",
        timestamp: "00:00",
        seconds: 0,
        text: "Arkadaşlar hoş geldiniz. Şimdiye kadar F = ma ile her kuvveti vektörel olarak bileşenlerine ayırdık.",
      },
      {
        id: "tr-km-2",
        timestamp: "00:45",
        seconds: 45,
        text: "Ama küresel yüzeyde kayan bir boncuk düşündüğünüzde tepki kuvvetini önceden bilemiyoruz.",
      },
      {
        id: "tr-km-3",
        timestamp: "02:10",
        seconds: 130,
        text: "İşte bugün skaler enerjiler üzerinden çalışan Lagrange mekaniğine geçiyoruz.",
      },
      {
        id: "tr-km-4",
        timestamp: "11:45",
        seconds: 705,
        text: "Dikkat edin, toplam mekanik enerji T artı V'dir ama Lagrangian L eşittir T eksi V olarak tanımlanır!",
        isProfessorHighlight: true,
      },
      {
        id: "tr-km-5",
        timestamp: "12:30",
        seconds: 750,
        text: "Sakın işaret hatası yapmayın; sınav kağıtlarında en çok T + V yazıldığı için puan kırıyorum.",
        isProfessorHighlight: true,
      },
      {
        id: "tr-km-6",
        timestamp: "24:05",
        seconds: 1445,
        text: "Burada Euler-Lagrange hareket denklemini ve kanonik momentum tanımını çıkarıyoruz.",
      },
    ],
    createdAt: "2026-10-28T14:00:00Z",
  },
  {
    id: "lec-emt-03",
    courseId: "course-elektromanyetizma",
    title: "3 DERSELEKTROMAGNETİK TEORİ.mp4 — Elektrostatik Potansiyel, Poisson ve Laplace Denklemleri",
    recordedDate: "2 Kasım 2026",
    sourceType: "video",
    durationLabel: "46:15",
    executiveSummary:
      "Elektrostatik alanın korunumlu yapısı ($\\nabla \\times \\mathbf{E} = 0$) incelenerek skaler potansiyel $\\mathbf{E} = -\\nabla V$ bağıntısı çıkarılmıştır. Gauss yasası diferansiyel formuyla birleştirilerek elektrostatik sınır değer problemlerinin temelini oluşturan Poisson denklemi ($\\nabla^2 V = -\\rho/\\varepsilon_0$) ve serbest yükün olmadığı bölgeler için Laplace denklemi ($\\nabla^2 V = 0$) formüle edilmiştir.",
    timeline: [
      {
        id: "seg-emt3-1",
        timestamp: "00:41",
        seconds: 41,
        title: "Ders Girişi, İdari Bilgiler ve Çevrimiçi Kayıt Duyuruları",
        summary:
          "Hoca canlı derse katılım olmasa da kayıtların sisteme yükleneceğini belirterek önceki dönemlerin ders videolarını da izlemeyi tavsiye etti.",
        spokenTranscript:
          "Evet arkadaşlar iyi akşamlar diliyorum. Bugünkü dersimize başlamak istiyorum. Bugün siteme daha önceki dönemlerde online olarak değil de sınıf ortamında anlattığım derslerin videolarını da size yükledim, bunları lütfen izleyin.",
        equations: [],
        isExamAlert: false,
      },
      {
        id: "seg-emt3-2",
        timestamp: "02:05",
        seconds: 125,
        title: "Elektrostatik Potansiyel ve Gradyen Bağıntısı (E = -∇V)",
        summary:
          "Elektrostatik alan korunumlu olduğundan rotasyoneli sıfırdır. Bu sayede vektörel alan skaler potansiyelin negatif gradyeni olarak tanımlanmıştır.",
        spokenTranscript:
          "Bildiğiniz gibi elektrostatik alan korunumlu bir alandır, yani rotasyoneli sıfırdır. Rotasyoneli sıfır olan her vektör bir skaler fonksiyonun gradyeni olarak ifade edilebilir: E eşittir eksi grad V.",
        equations: [
          "\\nabla \\times \\mathbf{E} = 0 \\implies \\mathbf{E} = -\\nabla V",
          "V(\\mathbf{r}) = -\\int_{\\mathcal{O}}^{\\mathbf{r}} \\mathbf{E} \\cdot d\\mathbf{l}",
        ],
        isExamAlert: true,
        professorQuote:
          "E eşittir eksi grad V tanımındaki eksi işaretinin fiziksel anlamını soracağım: Elektrik alan her zaman azalan potansiyel yönündedir!",
      },
      {
        id: "seg-emt3-3",
        timestamp: "04:05",
        seconds: 245,
        title: "Poisson ve Laplace Diferansiyel Denklemleri",
        summary:
          "Gauss yasası (div E = rho / epsilon_0) içerisine E = -grad V yazılarak Poisson denklemi, yük olmayan bölgelerde ise Laplace denklemi elde edildi.",
        spokenTranscript:
          "Gauss yasasını hatırlayalım: div E eşittir rho bölü epsilon sıfır. E yerine eksi grad V yazdığımızda Laplasyen V eşittir eksi rho bölü epsilon sıfır denklemini yani Poisson denklemini elde ederiz. Yüksüz bölgede ise Laplace denklemine dönüşür.",
        equations: [
          "\\nabla^2 V = -\\frac{\\rho}{\\varepsilon_0} \\quad (\\text{Poisson})",
          "\\nabla^2 V = 0 \\quad (\\text{Laplace})",
        ],
        isExamAlert: true,
        professorQuote:
          "Arkadaşlar bu Laplace denklemi ve kartezyen koordinatlarda değişkenlerine ayırma yöntemi vizede garanti karşınıza çıkacaktır, bunu sakın unutmayın!",
      },
    ],
    whiteboardExtractions: [
      {
        id: "wb-emt3-1",
        timestamp: "02:15",
        seconds: 135,
        title: "Elektrostatik Korunum ve Skaler Potansiyel",
        latex: "\\nabla \\times \\mathbf{E} = 0 \\iff \\oint_C \\mathbf{E}\\cdot d\\mathbf{l} = 0 \\implies \\mathbf{E} = -\\nabla V",
        variablesExplanation:
          "$\\mathbf{E}$: Elektrik alan vektörü (V/m), $V$: Elektrostatik skaler potansiyel (Volt). Eksi işareti enerjinin korunumunu ve alan çizgilerinin potansiyelin azaldığı yöne yöneldiğini belirtir.",
      },
      {
        id: "wb-emt3-2",
        timestamp: "04:12",
        seconds: 252,
        title: "Poisson ve Laplace Denklemleri (Laplasyen Operatörü)",
        latex: "\\nabla^2 V = \\frac{\\partial^2 V}{\\partial x^2} + \\frac{\\partial^2 V}{\\partial y^2} + \\frac{\\partial^2 V}{\\partial z^2} = -\\frac{\\rho}{\\varepsilon_0}",
        variablesExplanation:
          "$\\nabla^2$: İkinci dereceden skaler Laplasyen operatörü, $\\rho$: Hacimsel yük yoğunluğu (C/m³), $\\varepsilon_0$: Boş uzayın elektriksel geçirgenliği ($8.854\\times 10^{-12}\\,\\text{F/m}$).",
      },
    ],
    examAlerts: [
      {
        id: "ea-emt3-1",
        timestamp: "02:05",
        seconds: 125,
        severity: "critical",
        topic: "E = -∇V Eksi İşaretinin Fiziksel Anlamı",
        professorQuote:
          "E eşittir eksi grad V tanımındaki eksi işaretinin fiziksel anlamını soracağım: Elektrik alan her zaman azalan potansiyel yönündedir!",
        examTip:
          "Potansiyel pozitif yükün etrafında yüksektir, uzaklaştıkça düşer; elektrik alan çizgileri de pozitif yükten dışarı doğru çıktığı için gradyene ters işaretlidir.",
      },
      {
        id: "ea-emt3-2",
        timestamp: "05:20",
        seconds: 320,
        severity: "critical",
        topic: "Laplace Denklemi Sınır Değer Çözümü (Vize Garanti Soru)",
        professorQuote:
          "Arkadaşlar bu Laplace denklemi ve kartezyen koordinatlarda değişkenlerine ayırma yöntemi vizede garanti karşınıza çıkacaktır, bunu sakın unutmayın!",
        examTip:
          "$V(x,y) = X(x)Y(y)$ değişkenlere ayırma yönteminde sinüs/kosinüs ve hiperbolik fonksiyonları sınır koşullarına ($V(0,y)=0$, $V(a,y)=0$) göre doğru seçtiğinden emin ol.",
      },
    ],
    conceptMap: [
      {
        id: "cm-emt3-1",
        concept: "Korunumlu Elektrostatik Alan",
        formula: "\\nabla \\times \\mathbf{E} = 0",
        description: "Yol bağımsız iş ve skaler potansiyelin varlığının gerek ve yeter koşulu.",
        connectsTo: "Skaler Potansiyel (V)",
      },
      {
        id: "cm-emt3-2",
        concept: "Poisson Denklemi",
        formula: "\\nabla^2 V = -\\rho / \\varepsilon_0",
        description: "Yük dağılımı ile potansiyel arasındaki temel diferansiyel ilişki.",
        connectsTo: "Laplace Denklemi (∇²V = 0)",
      },
    ],
    practiceQuestions: [
      {
        id: "pq-emt3-1",
        difficulty: "Vize",
        question:
          "Bir bölgede elektrostatik potansiyel $V(x, y, z) = 2x^2 y - 3yz^2$ Volt olarak verilmiştir. $(1, 2, -1)$ noktasındaki elektrik alan vektörünü ($\\mathbf{E}$) ve bu noktadaki hacimsel yük yoğunluğunu ($\\rho$) hesaplayınız.",
        hint: "$\\mathbf{E} = -\\nabla V$ ve $\\rho = -\\varepsilon_0 \\nabla^2 V$ bağıntılarını kullanınız.",
        solutionMarkdown:
          "**1. Elektrik Alanın Hesabı ($\\mathbf{E} = -\\nabla V$):**\n$$\\frac{\\partial V}{\\partial x} = 4xy, \\quad \\frac{\\partial V}{\\partial y} = 2x^2 - 3z^2, \\quad \\frac{\\partial V}{\\partial z} = -6yz$$\n$$\\mathbf{E} = -\\left(4xy\\,\\hat{\\mathbf{i}} + (2x^2 - 3z^2)\\,\\hat{\\mathbf{j}} - 6yz\\,\\hat{\\mathbf{k}}\\right)$$\n\n$(1, 2, -1)$ noktasında değerleri yerine yazalım:\n$$\\mathbf{E}(1, 2, -1) = -\\left(4(1)(2)\\,\\hat{\\mathbf{i}} + (2(1) - 3(-1)^2)\\,\\hat{\\mathbf{j}} - 6(2)(-1)\\,\\hat{\\mathbf{k}}\\right) = -8\\,\\hat{\\mathbf{i}} + 1\\,\\hat{\\mathbf{j}} - 12\\,\\hat{\\mathbf{k}}\\,\\text{V/m}$$\n\n**2. Hacimsel Yük Yoğunluğu (Poisson Denklemi):**\n$$\\nabla^2 V = \\frac{\\partial^2 V}{\\partial x^2} + \\frac{\\partial^2 V}{\\partial y^2} + \\frac{\\partial^2 V}{\\partial z^2} = 4y + 0 - 6y = -2y$$\n$$\\rho = -\\varepsilon_0 \\nabla^2 V = -\\varepsilon_0(-2y) = 2\\varepsilon_0 y$$\n\n$(1, 2, -1)$ noktasında $y=2$ olduğundan:\n$$\\rho = 4\\varepsilon_0 \\approx 35.42\\,\\text{pC/m}^3$$",
      },
    ],
    transcript: [
      {
        id: "tr-emt-1",
        timestamp: "0:41",
        seconds: 41,
        text: "Evet arkadaşlar iyi akşamlar diliyorum. Bugünkü dersimize",
      },
      {
        id: "tr-emt-2",
        timestamp: "0:46",
        seconds: 46,
        text: "eee başlamak istiyorum. Bugün siteme eee daha önceki dönemlerde eee online olarak",
      },
      {
        id: "tr-emt-3",
        timestamp: "0:54",
        seconds: 54,
        text: "değil de sınıf ortamında ders olarak anlattığım derslerim var. Onların",
      },
      {
        id: "tr-emt-4",
        timestamp: "0:58",
        seconds: 58,
        text: "videolarını da size yükledim. Eee, bu videoları da lütfen izleyin. Eee, şimdi",
      },
      {
        id: "tr-emt-5",
        timestamp: "1:05",
        seconds: 65,
        text: "derse bakıyorum öğrenci arkadaş da yok. Fakat buna rağmen e birazcık daha ders",
      },
      {
        id: "tr-emt-6",
        timestamp: "1:10",
        seconds: 70,
        text: "işleyeyim. Bunlar da en azından sistemde size yükleniyordur. Yani sizin sisteme",
      },
      {
        id: "tr-emt-7",
        timestamp: "1:15",
        seconds: 75,
        text: "de yükleniyordur. Bunlardan lütfen e izlerseniz iyi olur.",
      },
      {
        id: "tr-emt-8",
        timestamp: "1:35",
        seconds: 95,
        text: "Bugün Elektrostatik Potansiyel, Poisson ve Laplace denklemlerine giriş yapacağız.",
      },
      {
        id: "tr-emt-9",
        timestamp: "2:04",
        seconds: 124,
        text: "Bildiğiniz gibi elektrostatik alan korunumlu bir alandır, yani rotasyoneli özdeş olarak sıfırdır.",
      },
      {
        id: "tr-emt-10",
        timestamp: "2:28",
        seconds: 148,
        text: "Vektör analizinden biliyoruz ki rotasyoneli sıfır olan her vektör bir skaler fonksiyonun gradyeni olarak ifade edilebilir.",
        isProfessorHighlight: true,
      },
      {
        id: "tr-emt-11",
        timestamp: "2:55",
        seconds: 175,
        text: "Dolayısıyla E eşittir eksi grad V olarak tanımlıyoruz; buradaki eksi işareti elektrik alanın potansiyelin azaldığı yöne işaret ettiğini belirtir.",
      },
      {
        id: "tr-emt-12",
        timestamp: "3:30",
        seconds: 210,
        text: "Şimdi Gauss yasasını diferansiyel formda yazalım: div E eşittir rho bölü epsilon sıfır.",
      },
      {
        id: "tr-emt-13",
        timestamp: "4:05",
        seconds: 245,
        text: "E yerine eksi grad V yazdığımızda Laplasyen V eşittir eksi rho bölü epsilon sıfır denklemini elde ederiz ki buna Poisson denklemi diyoruz.",
        isProfessorHighlight: true,
      },
      {
        id: "tr-emt-14",
        timestamp: "4:48",
        seconds: 288,
        text: "Eğer baktığımız bölgede serbest yük yoksa yani rho eşittir sıfır ise bu denklem Laplace denklemine dönüşür.",
      },
      {
        id: "tr-emt-15",
        timestamp: "5:20",
        seconds: 320,
        text: "Arkadaşlar bu Laplace denklemi ve kartezyen koordinatlarda değişkenlerine ayırma yöntemi vizede garanti karşınıza çıkacaktır, bunu sakın unutmayın!",
        isProfessorHighlight: true,
      },
      {
        id: "tr-emt-16",
        timestamp: "6:15",
        seconds: 375,
        text: "Şimdi iki paralel iletken levha arasındaki potansiyel dağılımını bu sınır koşullarıyla çözerek başlayalım.",
      },
    ],
    createdAt: "2026-11-02T14:00:00Z",
  },
  {
    id: "lec-maxwell-01",
    courseId: "course-elektromanyetizma",
    title: "Ders 07: Yer Değiştirme Akımı, Maxwell Denklemleri ve Dalga Denklemi",
    recordedDate: "29 Ekim 2026",
    sourceType: "sample",
    durationLabel: "52:10",
    executiveSummary:
      "Ampère yasasının zamanla değişen elektrik alanlarda süreklilik denklemiyle çelişmesi incelenmiş, Maxwell'in yer değiştirme akımı yoğunluğu ($\\mathbf{J}_d = \\varepsilon_0 \\partial \\mathbf{E}/\\partial t$) eklenerek dört temel Maxwell denklemi diferansiyel ve integral formlarda tamamlanmıştır. Ardından yüksüz vakumda rotasyonel kimliği kullanılarak elektromanyetik dalga denklemi ve ışık hızı $c = 1/\\sqrt{\\mu_0\\varepsilon_0}$ türetilmiştir.",
    timeline: [
      {
        id: "seg-em-1",
        timestamp: "02:30",
        seconds: 150,
        title: "Dolmakta Olan Kondansatör Paradoksu ve Yer Değiştirme Akımı",
        summary:
          "Kondansatör levhaları arasındaki boşlukta iletim akımı sıfır olduğu halde manyetik alan oluşmasının nedeni Maxwell düzeltmesiyle açıklandı.",
        spokenTranscript:
          "Düz yüzeyden akım geçiyor ama kondansatör plakaları arasından geçen balon yüzeyden iletim akımı geçmiyor! Süreklilik denklemini kurtarmak için Ampère yasasına epsilon sıfır dE/dt terimini eklemek zorundayız.",
        equations: [
          "\\nabla \\cdot (\\nabla \\times \\mathbf{B}) = 0 \\implies \\mathbf{J}_d = \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}",
        ],
        isExamAlert: true,
        professorQuote:
          "Dairesel plakalı kondansatörün plakaları arasındaki radyal mesafeye bağlı manyetik alan hesabı klasik vize sorusudur, bunu sakın unutmayın!",
      },
      {
        id: "seg-em-2",
        timestamp: "21:00",
        seconds: 1260,
        title: "Vakumda Dört Maxwell Denklemi",
        summary:
          "Gauss, Manyetik Gauss, Faraday ve Ampère-Maxwell yasalarının tam kümesi karşılaştırmalı olarak yazıldı.",
        spokenTranscript:
          "İşte klasik elektrodinamiğin tüm özeti bu dört satırda. Manyetik tek kutup (monopol) gözlenmediği için div B her zaman sıfırdır.",
        equations: [
          "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\qquad \\nabla \\cdot \\mathbf{B} = 0",
          "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}, \\qquad \\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}",
        ],
        isExamAlert: false,
      },
      {
        id: "seg-em-3",
        timestamp: "35:20",
        seconds: 2120,
        title: "Elektromanyetik Dalga Denkleminin Türetilişi",
        summary:
          "Faraday yasasının her iki tarafının rotasyoneli ($\nabla \times (\nabla \times \mathbf{E})$) alınarak 3 boyutlu dalga denklemi elde edildi.",
        spokenTranscript:
          "Rotasyonelin rotasyoneli vektör özdeşliğini ezbere bileceksiniz: grad div eksi Laplasyen! Boş uzayda yük yok, div E sıfır, geriye doğrudan ışık hızında yayılan dalga denklemi kalıyor. Bu türetme finalde kesin çıkar!",
        equations: [
          "\\nabla \\times (\\nabla \\times \\mathbf{E}) = \\nabla(\\nabla \\cdot \\mathbf{E}) - \\nabla^2\\mathbf{E}",
          "\\nabla^2\\mathbf{E} = \\mu_0\\varepsilon_0 \\frac{\\partial^2 \\mathbf{E}}{\\partial t^2}, \\qquad c = \\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}}",
        ],
        isExamAlert: true,
        professorQuote:
          "Rotasyonelin rotasyoneli özdeşliği ile Maxwell denklemlerinden dalga denklemini türetme adımı finalde kesin çıkar!",
      },
    ],
    whiteboardExtractions: [
      {
        id: "wb-em-1",
        timestamp: "08:40",
        seconds: 520,
        title: "Ampère-Maxwell Yasası (İntegral Form)",
        latex: "\\oint_C \\mathbf{B} \\cdot d\\mathbf{l} = \\mu_0 I_{\\text{iç}} + \\mu_0\\varepsilon_0 \\frac{d\\Phi_E}{dt}",
        variablesExplanation:
          "$\\Phi_E = \\iint_S \\mathbf{E}\\cdot d\\mathbf{A}$: Elektrik akısı, $I_d = \\varepsilon_0 d\\Phi_E/dt$: Yer değiştirme akımı.",
      },
      {
        id: "wb-em-2",
        timestamp: "37:10",
        seconds: 2230,
        title: "Vakumda Elektromanyetik Dalga Denklemi ve Poynting Vektörü",
        latex: "\\nabla^2 \\mathbf{E} - \\frac{1}{c^2}\\frac{\\partial^2 \\mathbf{E}}{\\partial t^2} = 0, \\qquad \\mathbf{S} = \\frac{1}{\\mu_0}(\\mathbf{E} \\times \\mathbf{B})",
        variablesExplanation:
          "$\\mathbf{S}$: Birim alandan birim zamanda geçen elektromanyetik enerji akısı (W/m²), yayılma yönü $\\hat{\\mathbf{k}} = \\hat{\\mathbf{E}} \\times \\hat{\\mathbf{B}}$.",
      },
    ],
    examAlerts: [
      {
        id: "ea-em-1",
        timestamp: "02:30",
        seconds: 150,
        severity: "critical",
        topic: "Kondansatör İçinde İndüklenen Manyetik Alan",
        professorQuote:
          "Dairesel plakalı kondansatörün plakaları arasındaki radyal mesafeye bağlı manyetik alan hesabı klasik vize sorusudur, bunu sakın unutmayın!",
        examTip:
          "$r < R$ için $B(2\\pi r) = \\mu_0\\varepsilon_0 (\\pi r^2)\\frac{dE}{dt} \\implies B(r) = \\frac{\\mu_0\\varepsilon_0 r}{2}\\frac{dE}{dt}$ (içeride $r$ ile doğrusal artar, dışarıda $1/r$ ile azalır).",
      },
      {
        id: "ea-em-2",
        timestamp: "35:20",
        seconds: 2120,
        severity: "critical",
        topic: "Dalga Denklemi Türetimi",
        professorQuote:
          "Rotasyonelin rotasyoneli özdeşliği ile Maxwell denklemlerinden dalga denklemini türetme adımı finalde kesin çıkar!",
        examTip:
          "$\\nabla \\times (\\nabla \\times \\mathbf{E}) = \\nabla(\\nabla \\cdot \\mathbf{E}) - \\nabla^2\\mathbf{E}$ özdeşliğinde eksi işaretine ve $\\rho=0, \\mathbf{J}=0$ vakum kabullerini açıkça belirtmeye dikkat et.",
      },
    ],
    conceptMap: [
      {
        id: "cm-em-1",
        concept: "Süreklilik Denklemi",
        formula: "\\nabla \\cdot \\mathbf{J} + \\partial_t \\rho = 0",
        description: "Yük korunumu yasası, statik Ampère yasasının eksikliğini ortaya çıkarır.",
        connectsTo: "Yer Değiştirme Akımı (J_d)",
      },
      {
        id: "cm-em-2",
        concept: "Maxwell Denklemleri",
        formula: "\\nabla \\times \\mathbf{B} = \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\partial_t\\mathbf{E}",
        description: "Değişen elektrik alan manyetik alan, değişen manyetik alan elektrik alan üretir.",
        connectsTo: "Elektromanyetik Dalgalar",
      },
    ],
    practiceQuestions: [
      {
        id: "pq-em-1",
        difficulty: "Vize",
        question:
          "Yarıçapı $R$ olan paralel dairesel plakalı bir kondansatör sabit $I$ akımıyla doldurulmaktadır. Plakalar arasındaki bölgede ($r < R$ ve $r > R$) manyetik alanın büyüklüğünü $r$'nin fonksiyonu olarak bulunuz.",
        hint: "Plakalar arasında iletim akımı $I_{\\text{iç}} = 0$'dır. Düzgün elektrik alan $E(t) = \\frac{Q(t)}{\\varepsilon_0 \\pi R^2}$ üzerinden $r$ yarıçaplı Amper halkasından geçen $\\Phi_E$'yi hesaplayın.",
        solutionMarkdown:
          "**1. $r < R$ Bölgesi (Plakalar İçi):**\nToplam elektrik alan $E = \\frac{Q}{\\varepsilon_0 \\pi R^2} \\implies \\frac{dE}{dt} = \\frac{I}{\\varepsilon_0 \\pi R^2}$.\n$r$ yarıçaplı daireden geçen akı türevi:\n$$\\frac{d\\Phi_E}{dt} = (\\pi r^2)\\frac{dE}{dt} = \\frac{I r^2}{\\varepsilon_0 R^2}$$\nAmpère-Maxwell yasasından:\n$$B(2\\pi r) = \\mu_0\\varepsilon_0 \\frac{I r^2}{\\varepsilon_0 R^2} \\implies B(r) = \\frac{\\mu_0 I r}{2\\pi R^2}$$\n\n**2. $r > R$ Bölgesi (Plakalar Dışı):**\nTüm elektrik akısı halkanın içinde kaldığından $\\varepsilon_0 \\frac{d\\Phi_E}{dt} = I$:\n$$B(2\\pi r) = \\mu_0 I \\implies B(r) = \\frac{\\mu_0 I}{2\\pi r}$$",
      },
    ],
    transcript: [
      {
        id: "tr-em-1",
        timestamp: "02:30",
        seconds: 150,
        text: "Düz yüzeyden akım geçiyor ama kondansatör plakaları arasından geçen balon yüzeyden iletim akımı geçmiyor!",
        isProfessorHighlight: true,
      },
      {
        id: "tr-em-2",
        timestamp: "03:10",
        seconds: 190,
        text: "Süreklilik denklemini kurtarmak için Ampère yasasına epsilon sıfır dE/dt terimini eklemek zorundayız.",
      },
      {
        id: "tr-em-3",
        timestamp: "21:00",
        seconds: 1260,
        text: "İşte klasik elektrodinamiğin tüm özeti bu dört satırda; Gauss, manyetik Gauss, Faraday ve Ampère-Maxwell.",
      },
      {
        id: "tr-em-4",
        timestamp: "21:40",
        seconds: 1300,
        text: "Manyetik tek kutup (monopol) gözlenmediği için div B her zaman sıfırdır.",
      },
      {
        id: "tr-em-5",
        timestamp: "35:20",
        seconds: 2120,
        text: "Rotasyonelin rotasyoneli vektör özdeşliğini ezbere bileceksiniz: grad div eksi Laplasyen!",
        isProfessorHighlight: true,
      },
      {
        id: "tr-em-6",
        timestamp: "36:00",
        seconds: 2160,
        text: "Boş uzayda yük yok, div E sıfır, geriye doğrudan ışık hızında yayılan dalga denklemi kalıyor.",
        isProfessorHighlight: true,
      },
    ],
    createdAt: "2026-10-29T11:00:00Z",
  },
  {
    id: "lec-kuantum-01",
    courseId: "course-kuantum-fizigi",
    title: "Ders 05: Zamandan Bağımsız Schrödinger Denklemi ve 1B Sonsuz Potansiyel Kuyusu",
    recordedDate: "30 Ekim 2026",
    sourceType: "sample",
    durationLabel: "46:15",
    executiveSummary:
      "Değişkenlere ayırma yöntemiyle $\\Psi(x,t) = \\psi(x)e^{-iEt/\\hbar}$ durağan durum çözümleri elde edilmiş, $[0, L]$ aralığındaki 1 boyutlu sonsuz potansiyel kuyusu için sınır koşulları uygulanarak enerji özdeğerlerinin kuantizasyonu ($E_n \\propto n^2$) ve normalize özfonksiyonlar türetilmiştir. Ayrıca iki farklı enerji özfonksiyonunun süperpozisyonunda olasılık yoğunluğunun zamanla nasıl salındığı incelenmiştir.",
    timeline: [
      {
        id: "seg-qm-1",
        timestamp: "04:10",
        seconds: 250,
        title: "Durağan Durumlar ve Zaman Faz Çarpanı",
        summary:
          "Tek bir enerji özdurumunda $|\Psi(x,t)|^2 = |\psi(x)|^2$ olasılık yoğunluğunun zamandan bağımsız olduğu gösterildi.",
        spokenTranscript:
          "Durağan durum demek parçacık duruyor demek değildir; beklenen değerler zamana göre değişmiyor demektir! Ama iki farklı E_1 ve E_2 durumunu toplarsanız girişim terimi cos((E_2 - E_1)t / hbar) frekansıyla salınır.",
        equations: [
          "\\Psi(x,t) = \\psi(x)e^{-iEt/\\hbar}",
          "-\\frac{\\hbar^2}{2m}\\frac{d^2\\psi}{dx^2} + V(x)\\psi(x) = E\\psi(x)",
        ],
        isExamAlert: true,
        professorQuote:
          "Süperpozisyon durumunda olasılık yoğunluğunun zamana bağlı kalma şartı sınavda kesin sorulur!",
      },
      {
        id: "seg-qm-2",
        timestamp: "19:50",
        seconds: 1190,
        title: "1B Sonsuz Potansiyel Kuyusu Özdeğer ve Özfonksiyonları",
        summary:
          "$\psi(0) = 0$ ve $\psi(L) = 0$ sınır koşullarından $k_n = n\pi/L$ kuantizasyonu ve sıfır nokta enerjisi $E_1 > 0$ elde edildi.",
        spokenTranscript:
          "Dikkat edin n = 0 olamaz çünkü n = 0 koyarsanız dalga fonksiyonu her yerde sıfır olur, yani kutuda parçacık olmaz! Taban durum enerjisinin sıfırdan büyük olması doğrudan Heisenberg belirsizlik ilkesinin sonucudur.",
        equations: [
          "\\psi_n(x) = \\sqrt{\\frac{2}{L}}\\sin\\left(\\frac{n\\pi x}{L}\\right), \\qquad E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2} \\quad (n=1,2,3,\\dots)",
        ],
        isExamAlert: true,
        professorQuote:
          "Taban durumunda neden E = 0 olamadığını Heisenberg belirsizlik ilkesiyle açıklamanızı isteyeceğim, bunu sakın unutmayın!",
      },
    ],
    whiteboardExtractions: [
      {
        id: "wb-qm-1",
        timestamp: "20:30",
        seconds: 1230,
        title: "Sonsuz Kuyu Özfonksiyonları ve Orthonormalite",
        latex: "\\int_0^L \\psi_m^*(x)\\psi_n(x)\\,dx = \\delta_{mn}, \\qquad E_n = n^2 E_1",
        variablesExplanation:
          "$\\delta_{mn}$: Kronecker deltası ($m=n$ ise $1$, $m\\neq n$ ise $0$). Farklı özdurumlar birbirine diktir, bu sayede katsayıları $c_n = \\int \\psi_n^* \\Psi(x,0)\\,dx$ Fourier hilesiyle buluruz.",
      },
    ],
    examAlerts: [
      {
        id: "ea-qm-1",
        timestamp: "04:10",
        seconds: 250,
        severity: "critical",
        topic: "Süperpozisyon Durumunda Zamana Bağlı Evrim",
        professorQuote:
          "Başlangıçta $\\Psi(x,0) = c_1\\psi_1(x) + c_2\\psi_2(x)$ verip $t$ anındaki $\\Psi(x,t)$ ve $\\langle E \\rangle$ hesabını sınavda mutlaka sorarım!",
        examTip:
          "Her terimi KENDİ enerji fazıyla çarp: $\\Psi(x,t) = c_1\\psi_1 e^{-iE_1 t/\\hbar} + c_2\\psi_2 e^{-iE_2 t/\\hbar}$ ve beklenen enerji $\\langle H \\rangle = |c_1|^2 E_1 + |c_2|^2 E_2$.",
      },
    ],
    conceptMap: [
      {
        id: "cm-qm-1",
        concept: "Sınır Koşulları",
        formula: "\\psi(0) = \\psi(L) = 0",
        description: "Dalga fonksiyonunun sürekliliği dalga sayısını ayrık değerlere zorlar.",
        connectsTo: "Enerji Kuantizasyonu (E_n)",
      },
      {
        id: "cm-qm-2",
        concept: "Sıfır Nokta Enerjisi",
        formula: "E_1 = \\frac{\\pi^2\\hbar^2}{2mL^2} > 0",
        description: "Sınırlı hacimde $\\Delta x \\le L$ olduğundan $\\Delta p > 0$ olmak zorundadır.",
        connectsTo: "Heisenberg Belirsizlik İlkesi",
      },
    ],
    practiceQuestions: [
      {
        id: "pq-qm-1",
        difficulty: "Vize",
        question:
          "$[0, L]$ aralığındaki sonsuz potansiyel kuyusunda bir parçacığın $t=0$ anındaki dalga fonksiyonu $\\Psi(x,0) = A\\left[\\psi_1(x) + \\sqrt{3}\\psi_2(x)\\right]$ olarak veriliyor. $A$ normalizasyon sabitini, $t$ anındaki dalga fonksiyonunu ve enerji ölçümünde $E_2$ bulma olasılığını hesaplayınız.",
        hint: "$\\psi_1$ ve $\\psi_2$ zaten ortonormal olduğundan $|c_1|^2 + |c_2|^2 = 1$ koşulunu doğrudan kullanabilirsiniz!",
        solutionMarkdown:
          "**1. Normalizasyon:**\n$$|A|^2(1^2 + (\\sqrt{3})^2) = 4|A|^2 = 1 \\implies A = \\frac{1}{2}$$\nDolayısıyla $c_1 = \\frac{1}{2}$ ve $c_2 = \\frac{\\sqrt{3}}{2}$.\n\n**2. $t$ Anındaki Dalga Fonksiyonu:**\n$$\\Psi(x,t) = \\frac{1}{2}\\psi_1(x)e^{-iE_1 t/\\hbar} + \\frac{\\sqrt{3}}{2}\\psi_2(x)e^{-i4E_1 t/\\hbar}$$\n\n**3. $E_2$ Ölçme Olasılığı ve Beklenen Enerji:**\n$$P(E_2) = |c_2|^2 = \\left(\\frac{\\sqrt{3}}{2}\\right)^2 = \\frac{3}{4} = \\%75$$\n$$\\langle E \\rangle = \\frac{1}{4}E_1 + \\frac{3}{4}(4E_1) = \\frac{13}{4}E_1$$",
      },
    ],
    createdAt: "2026-10-30T15:00:00Z",
  },
  {
    id: "lec-termo-01",
    courseId: "course-termodinamik",
    title: "Ders 06: Entropi, Carnot Verimi ve Termodinamik Maxwell Bağıntıları",
    recordedDate: "30 Ekim 2026",
    sourceType: "sample",
    durationLabel: "44:50",
    executiveSummary:
      "Clausius eşitsizliği üzerinden hal fonksiyonu olarak entropi ($dS = \\delta Q_{\\text{tersinir}}/T$) tanımlanmış, Carnot çevriminin maksimum ısıl verimi türetilmiş ve iç enerji ($U$), entalpi ($H$), Helmholtz ($F$) ve Gibbs ($G$) serbest enerjilerinin tam diferansiyellerinden dört temel Maxwell bağıntısı çıkarılmıştır.",
    timeline: [
      {
        id: "seg-td-1",
        timestamp: "07:20",
        seconds: 440,
        title: "Carnot Çevrimi ve İkinci Yasa Sınırı",
        summary:
          "İki izotermal ve iki adyabatik süreçten oluşan tersinir Carnot makinesinin verimi $\eta = 1 - T_C/T_H$ olarak kanıtlandı.",
        spokenTranscript:
          "Sıcaklıkları sakın Celsius cinsinden formüle yazmayın! Termodinamik verim formüllerinde T her zaman mutlak Kelvin sıcaklığıdır.",
        equations: ["\\eta_{\\text{Carnot}} = 1 - \\frac{T_C}{T_H}"],
        isExamAlert: true,
        professorQuote:
          "Celsius'u Kelvin'e (+273.15) çevirmeden Carnot verimi hesaplayan tüm soruyu sıfırlar!",
      },
      {
        id: "seg-td-2",
        timestamp: "26:15",
        seconds: 1575,
        title: "Serbest Enerjiler ve Maxwell Bağıntıları",
        summary:
          "Legendre dönüşümleriyle $F = U - TS$ ve $G = H - TS$ tanımlanıp karışık ikinci kısmi türevlerin eşitliğinden Maxwell bağıntıları çıkarıldı.",
        spokenTranscript:
          "Maxwell bağıntılarını ezberlemeye çalışmayın; dU = TdS - PdV denklemini yazıp çapraz türev alarak 20 saniyede hatasız çıkarabilirsiniz. Sınavda ölçülemeyen entropi türevini P, V, T türevine çevirme sorusu kesin gelecek.",
        equations: [
          "dF = -S\\,dT - P\\,dV \\implies \\left(\\frac{\\partial S}{\\partial V}\\right)_T = \\left(\\frac{\\partial P}{\\partial T}\\right)_V",
          "dG = -S\\,dT + V\\,dP \\implies -\\left(\\frac{\\partial S}{\\partial P}\\right)_T = \\left(\\frac{\\partial V}{\\partial T}\\right)_P",
        ],
        isExamAlert: true,
        professorQuote:
          "Bu kısım sınavda çıkabilir: Entropinin hacme veya basınca göre türevini Maxwell bağıntısıyla hal denklemine bağlama sorusu kesin gelecek!",
      },
    ],
    whiteboardExtractions: [
      {
        id: "wb-td-1",
        timestamp: "27:00",
        seconds: 1620,
        title: "Dört Termodinamik Potansiyel ve Doğal Değişkenleri",
        latex: "\\begin{aligned} dU &= T\\,dS - P\\,dV \\\\ dH &= T\\,dS + V\\,dP \\\\ dF &= -S\\,dT - P\\,dV \\\\ dG &= -S\\,dT + V\\,dP \\end{aligned}",
        variablesExplanation:
          "$U(S,V)$: İç enerji, $H(S,P)$: Entalpi, $F(T,V)$: Helmholtz serbest enerjisi, $G(T,P)$: Gibbs serbest enerjisi.",
      },
    ],
    examAlerts: [
      {
        id: "ea-td-1",
        timestamp: "26:15",
        seconds: 1575,
        severity: "critical",
        topic: "Maxwell Bağıntılarıyla Entropi Değişimi Hesabı",
        professorQuote:
          "Bu kısım sınavda çıkabilir: van der Waals gazının izotermal genişlemesinde iç enerji ve entropi değişimini Maxwell bağıntısıyla bulmanızı isteyeceğim!",
        examTip:
          "$\\left(\\frac{\\partial U}{\\partial V}\\right)_T = T\\left(\\frac{\\partial P}{\\partial T}\\right)_V - P$ enerji denklemini $dU = T\\,dS - P\\,dV$ üzerinden anında türetebilirsin.",
      },
    ],
    conceptMap: [
      {
        id: "cm-td-1",
        concept: "Clausius Teoremi",
        formula: "\\oint \\frac{\\delta Q}{T} \\le 0",
        description: "Tersinir çevrimde eşitlik sağlanır ve $S$ hal fonksiyonunu tanımlar.",
        connectsTo: "Termodinamik Potansiyeller",
      },
      {
        id: "cm-td-2",
        concept: "Legendre Dönüşümü",
        formula: "F = U - TS,\\; G = H - TS",
        description: "Kontrolü zor $(S, V)$ değişkenlerinden laboratuvar değişkenleri $(T, P)$'ye geçiş.",
        connectsTo: "Maxwell Bağıntıları",
      },
    ],
    practiceQuestions: [
      {
        id: "pq-td-1",
        difficulty: "Final",
        question:
          "Hal denklemi $\\left(P + \\frac{a}{v^2}\\right)(v - b) = RT$ olan 1 mol van der Waals gazı sabit $T$ sıcaklığında $v_1$ hacminden $v_2$ hacmine tersinir olarak genişliyor. Gazın entropi değişimini ($\\Delta S$) Maxwell bağıntısını kullanarak hesaplayınız.",
        hint: "$\\left(\\frac{\\partial S}{\\partial v}\\right)_T = \\left(\\frac{\\partial P}{\\partial T}\\right)_v$ Maxwell bağıntısını kullanıp sabit $T$'de $v_1$'den $v_2$'ye integre edin.",
        solutionMarkdown:
          "**Çözüm:**\nHal denkleminden basıncı çekelim:\n$$P(T, v) = \\frac{RT}{v - b} - \\frac{a}{v^2}$$\nSabit hacimde sıcaklığa göre türev alalım:\n$$\\left(\\frac{\\partial P}{\\partial T}\\right)_v = \\frac{R}{v - b}$$\nHelmholtz serbest enerjisinden gelen Maxwell bağıntısı gereği:\n$$\\left(\\frac{\\partial S}{\\partial v}\\right)_T = \\left(\\frac{\\partial P}{\\partial T}\\right)_v = \\frac{R}{v - b}$$\nSabit $T$'de $v_1$'den $v_2$'ye integre edersek:\n$$\\Delta S = \\int_{v_1}^{v_2} \\frac{R}{v - b}\\,dv = R\\ln\\left(\\frac{v_2 - b}{v_1 - b}\\right)$$",
      },
    ],
    createdAt: "2026-10-30T16:30:00Z",
  },
];

export const INITIAL_RESOURCES: CourseResource[] = [
  {
    id: "res-km-mit",
    courseId: "course-klasik-mekanik",
    title: "Analitik Mekanik Formül Özeti: Lagrange & Noether Simetrileri",
    source: "Açık Akademik Ders Notu (MIT 8.033 / Goldstein Uyarlaması)",
    url: "https://ocw.mit.edu",
    summary:
      "Uzay öteleme, zaman öteleme ve dönme simetrilerinin doğrusal momentum, enerji ve açısal momentum korunumuna bağlanışı.",
    contentMarkdown:
      "### Noether Teoremi Hızlı Tablosu\n- **Zaman Öteleme Simetrisi** ($\\partial L / \\partial t = 0$) $\\implies$ Hamiltonyen / Enerji korunur: $$H = \\sum_i \\dot{q}_i \\frac{\\partial L}{\\partial \\dot{q}_i} - L = \\text{sabit}$$\n- **Uzay Öteleme Simetrisi** ($\\partial L / \\partial x = 0$) $\\implies$ Doğrusal momentum korunur: $p_x = \\text{sabit}$.\n- **Dönme Simetrisi** ($\\partial L / \\partial \\phi = 0$) $\\implies$ Açısal momentum korunur: $p_\\phi = \\text{sabit}$.",
    resourceType: "notes",
    createdAt: "2026-10-28T15:00:00Z",
  },
  {
    id: "res-em-griffiths",
    courseId: "course-elektromanyetizma",
    title: "Vektör Analizi ve Sınır Koşulları Başvuru Kartı",
    source: "Elektrodinamik Açık Kaynak Özeti",
    summary:
      "İki yalıtkan ortam arayüzeyinde elektrik ve manyetik alanların teğetsel ve dikey bileşenlerinin süreklilik koşulları.",
    contentMarkdown:
      "### Elektromanyetik Sınır Koşulları\nYüzey yük yoğunluğu $\\sigma$ ve yüzey akım yoğunluğu $\\mathbf{K}$ olan arayüzeyde:\n$$E_{1,\\perp} - E_{2,\\perp} = \\frac{\\sigma}{\\varepsilon_0}, \\qquad \\mathbf{E}_{1,\\parallel} = \\mathbf{E}_{2,\\parallel}$$\n$$B_{1,\\perp} = B_{2,\\perp}, \\qquad \\mathbf{B}_{1,\\parallel} - \\mathbf{B}_{2,\\parallel} = \\mu_0 (\\mathbf{K} \\times \\hat{\\mathbf{n}})$$",
    resourceType: "notes",
    createdAt: "2026-10-29T12:00:00Z",
  },
];

export const INITIAL_CHATS: Record<string, ChatMessage[]> = {
  "course-klasik-mekanik": [
    {
      id: "msg-welcome-km",
      courseId: "course-klasik-mekanik",
      role: "assistant",
      content:
        "Merhaba Azra! Ben **Klasik Mekanik (FİZ 201)** dersine özel yapay zeka eğitmeninim. Yalnızca bu dersin video analizlerine, tahtadaki formüllere ($L = T - V$, Euler-Lagrange denklemleri) ve hocanın sınav uyarılarına odaklanıyorum.\n\nİstersen birlikte vize provası yapabilir, Atwood aletindeki makara eylemsizlik terimini adım adım türetebilir veya elindeki bir mekanik sorusunun fotoğrafını yükleyip çözebiliriz!",
      createdAt: "2026-10-30T10:00:00Z",
    },
  ],
  "course-elektromanyetizma": [
    {
      id: "msg-welcome-em",
      courseId: "course-elektromanyetizma",
      role: "assistant",
      content:
        "Merhaba Azra! **Elektromanyetizma (FİZ 202)** çalışma odasındasın. Gauss yasası, yer değiştirme akımı ($\\mathbf{J}_d = \\varepsilon_0 \\partial_t \\mathbf{E}$), Maxwell denklemleri ve dalga denklemi üzerine tüm ders notların hazır. Nereden başlayalım?",
      createdAt: "2026-10-30T10:01:00Z",
    },
  ],
  "course-kuantum-fizigi": [
    {
      id: "msg-welcome-qm",
      courseId: "course-kuantum-fizigi",
      role: "assistant",
      content:
        "Merhaba Azra! **Kuantum Fiziği (FİZ 301)** özel sohbetindesin. Schrödinger denklemi, dalga fonksiyonu normalizasyonu, sonsuz potansiyel kuyusu ($E_n = \\frac{n^2\\pi^2\\hbar^2}{2mL^2}$) veya beklenen değer hesaplarından istediğini sorabilirsin!",
      createdAt: "2026-10-30T10:02:00Z",
    },
  ],
  "course-termodinamik": [
    {
      id: "msg-welcome-td",
      courseId: "course-termodinamik",
      role: "assistant",
      content:
        "Merhaba Azra! **Termodinamik ve İstatistiksel Fizik (FİZ 204)** özel asistanın hazır. Carnot çevrimi, entropi hesapları, serbest enerjiler ($U, H, F, G$) ve Maxwell bağıntıları için istediğin soruyu sorabilirsin.",
      createdAt: "2026-10-30T10:03:00Z",
    },
  ],
};
