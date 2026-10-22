import Script from "next/script";

const AW_ID = "AW-18415650137";
const CONVERSION_CONTACTAR = `${AW_ID}/7LR2CN_Y-OwcENmKos1E`;

// Etiqueta de Google Ads + conversión "Contactar" en cada clic a WhatsApp.
// Un solo listener cubre todos los enlaces wa.me / api.whatsapp.com del sitio.
// Solo se monta en el sitio público (marketing y tienda), no en el panel.
export function GoogleAds() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${AW_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${AW_ID}');

          document.addEventListener('click', function (e) {
            var link = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!link || !link.href) return;
            if (link.href.indexOf('wa.me') === -1 && link.href.indexOf('api.whatsapp.com') === -1) return;
            gtag('event', 'conversion', {
              'send_to': '${CONVERSION_CONTACTAR}',
              'value': 1.0,
              'currency': 'ARS'
            });
          }, true);
        `}
      </Script>
    </>
  );
}
