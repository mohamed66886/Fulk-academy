export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://academy.fulkegy.com/#software",
        name: "فُلك أكاديمي | Fulk Academy",
        alternateName: ["Fulk Academy", "منصة فلك أكاديمي", "أكاديمية فلك", "فلك للتعليم"],
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web, iOS, Android",
        description:
          "المنصة السحابية المتكاملة لإدارة المدرسين والسناتر والمجموعات التعليمية، تتبع الحضور والغياب الذكي برمز QR Code، وإدارة الامتحانات والدرجات والتقارير المباشرة لأولياء الأمور.",
        url: "https://academy.fulkegy.com",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EGP",
          availability: "https://schema.org/InStock",
        },
        publisher: {
          "@id": "https://fulkegy.com/#organization",
        },
        provider: {
          "@id": "https://fulkegy.com/#organization",
        },
        featureList: [
          "تسجيل حضور وغياب الطلاب بالكيو آر كود والباركود الذكي",
          "إرسال إشعارات وتقارير لحظية لأولياء الأمور",
          "إدارة المجموعات والمواعيد والاشتراكات الشهرية",
          "رصد درجات الامتحانات والتقييم الدوري للطلاب",
          "طباعة كروت الطلاب الذكية المزودة بـ QR Code",
          "لوحة تحكم للمدرسين والسناتر التعليمية متعددة الصلاحيات",
        ],
      },
      {
        "@type": "Organization",
        "@id": "https://fulkegy.com/#organization",
        name: "شركة فُلك للحلول التقنية",
        alternateName: ["Fulk Tech Solutions", "فُلك للبرمجيات", "Fulk Solutions", "فلك تكنولوجي"],
        url: "https://fulkegy.com",
        logo: "https://academy.fulkegy.com/icon.jpeg",
        slogan: "نبحر بك نحو التحول الرقمي",
        description:
          "شركة رائدة في مجال التحول الرقمي وتطوير الحلول البرمجية الذكية وتطبيقات الويب وأنظمة إدارة الأعمال والمؤسسات التعليمية في مصر والوطن العربي.",
        sameAs: [
          "https://www.facebook.com/profile.php?id=61582944127006",
          "https://www.tiktok.com/@.fulk6",
          "https://www.instagram.com/fulkegy",
          "https://www.linkedin.com/company/fulkegy/",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+201551290902",
            contactType: "customer service",
            areaServed: ["EG", "SA", "AE"],
            availableLanguage: ["Arabic", "English"],
            url: "https://wa.me/201551290902",
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://academy.fulkegy.com/#website",
        url: "https://academy.fulkegy.com",
        name: "فُلك أكاديمي",
        description:
          "منصة إدارة المعلمين والطلاب - تابعة لشركة فُلك للحلول التقنية (نبحر بك نحو التحول الرقمي)",
        publisher: {
          "@id": "https://fulkegy.com/#organization",
        },
        inLanguage: "ar",
      },
      {
        "@type": "FAQPage",
        "@id": "https://academy.fulkegy.com/#faq",
        mainEntity: [
          {
            "@type": "Question",
            name: "ما هي منصة فُلك أكاديمي (Fulk Academy)؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "فُلك أكاديمي هي منصة سحابية متخصصة في إدارة العملية التعليمية للمدرسين والسناتر والمراكز التدريبية، وتوفر تسجيل الحضور الذكي بالـ QR Code، إدارة المجموعات، متابعة الامتحانات والدرجات، وتقارير مباشرة لأولياء الأمور.",
            },
          },
          {
            "@type": "Question",
            name: "من هي الشركة المطورة والمالكة لمنصة فُلك أكاديمي؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "المنصة تابعة ومطورة بالكامل بواسطة شركة فُلك للحلول التقنية (Fulk Tech Solutions) الرائدة بشعار 'نبحر بك نحو التحول الرقمي'، وموقعها الرسمي fulkegy.com.",
            },
          },
          {
            "@type": "Question",
            name: "كيف يمكن تسجيل حضور وغياب الطلاب في فُلك أكاديمي؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "يتم تسجيل الحضور بدقة وسرعة فائقة من خلال مسح رمز الـ QR Code الخاص بكل طالب عبر كاميرا الهاتف أو ماسح الباركود، مع تحديث فوري لسجل الطالب وحساب نسب الحضور.",
            },
          },
          {
            "@type": "Question",
            name: "كيف يمكن التواصل مع إدارة فُلك للحلول التقنية؟",
            acceptedAnswer: {
              "@type": "Answer",
              text: "يمكن التواصل المباشر عبر الواتساب على الرقم 201551290902+ أو عبر منصات التواصل الاجتماعي الرسمية للشركة على فيسبوك، إنستجرام، تيك توك، ولينكد إن (fulkegy).",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
