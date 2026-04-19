import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = "Sávit - Mercado Saludable",
  description = "Productos naturales, keto, sin gluten y saludables directamente a tu WhatsApp. ¡Vive Sávit!",
  image = "/logo-pwa.png",
  url = "https://tumercadosavit.web.app/"
}) {
  // Datos estructurados JSON-LD para SEO Local (LocalBusiness / Store)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Sávit Mercado Saludable",
    "image": `https://tumercadosavit.web.app${image}`,
    "description": description,
    "url": url,
    "telephone": "+573000000000", // Reemplazar con el real si aplica
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Colombia", // Cambiar ciudad si es específica, ej: "Medellín"
      "addressCountry": "CO"
    }
  };

  return (
    <Helmet>
      {/* Basic HTML Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* OpenGraph Tags (Facebook, LinkedIn, WhatsApp) */}
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
