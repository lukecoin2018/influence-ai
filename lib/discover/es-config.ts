// ─────────────────────────────────────────────────────────────────────────────
// lib/discover/es-config.ts
// Spanish discover page configurations
// es    = Latin American Spanish (/es/discover/[slug])
// es-ES = Spain Spanish (/es-es/discover/[slug])
// ─────────────────────────────────────────────────────────────────────────────

export type EsVariant = 'es' | 'es-ES';
export type EsPageType = 'location' | 'niche';

export interface EsPageConfig {
  variant: EsVariant;
  type: EsPageType;
  platform: 'instagram' | 'tiktok';
  // location pages
  locationMatch?: string[];
  locationLabel?: string;
  // niche pages
  searchKeyword?: string;
  spanishCountriesOnly?: boolean;
  // common
  title: string;
  description: string;
  englishSlug: string;
  related: string[];
  educational: {
    heading: string;
    paragraphs: string[];
  };
}

// Spanish-speaking countries to filter niche pages by
export const SPANISH_COUNTRIES = [
  'Spain', 'Colombia', 'Mexico', 'México', 'Peru', 'Chile',
  'Argentina', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay',
  'Uruguay', 'Dominican Republic', 'Guatemala', 'Honduras',
  'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba',
];

// ─────────────────────────────────────────────────────────────────────────────
// ES-ES: Spain Spanish Pages
// ─────────────────────────────────────────────────────────────────────────────

export const ES_ES_PAGES: Record<string, EsPageConfig> = {

  // ── Location pages ────────────────────────────────────────────────────────

  'creadores-instagram-espana': {
    variant: 'es-ES',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Spain', 'Madrid', 'Barcelona'],
    locationLabel: 'España',
    title: 'Los Mejores Creadores de Instagram en España para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de Instagram verificados en España con datos reales de engagement. Nuestra base de datos incluye influencers de moda, lifestyle, belleza y gastronomía con audiencias auténticas.',
    englishSlug: 'instagram-creators-spain',
    related: ['creadores-tiktok-espana', 'creadores-instagram-madrid', 'belleza-instagram-es', 'moda-instagram-es'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en España: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'España cuenta con uno de los ecosistemas de creadores de contenido más activos de Europa. Los creadores españoles de Instagram han construido comunidades altamente comprometidas en categorías como moda, belleza, gastronomía y lifestyle — y su contenido tiene un alcance internacional significativo, especialmente en Latinoamérica y entre las comunidades hispanohablantes de Estados Unidos.',
        'Las tasas de engagement de los creadores españoles de Instagram oscilan entre el 3% y el 8%, superiores a la media europea en categorías como belleza y moda. El público español valora la autenticidad y el conocimiento genuino del producto — los creadores que explican el porqué detrás de sus recomendaciones generan significativamente más conversiones que los que se limitan a mostrar productos.',
        'La Semana de la Moda de Madrid, el calendario de belleza español y la rica escena gastronómica del país proporcionan contextos de contenido de alto valor a lo largo de todo el año. Las colaboraciones de marca integradas en estos momentos culturales obtienen un alcance orgánico mayor y una percepción más editorial que las publicaciones patrocinadas genéricas.',
        'Para marcas que buscan entrar en el mercado español o ampliar su presencia en Europa, los creadores españoles ofrecen una eficiencia de coste excelente combinada con un alcance potencial que se extiende más allá de España hacia los 500 millones de hispanohablantes en todo el mundo.',
      ],
    },
  },

  'creadores-instagram-madrid': {
    variant: 'es-ES',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Madrid'],
    locationLabel: 'Madrid',
    title: 'Los Mejores Creadores de Instagram en Madrid para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de Instagram verificados en Madrid con datos reales de engagement. La escena creativa de Madrid abarca moda, lifestyle, gastronomía y belleza con audiencias urbanas altamente comprometidas.',
    englishSlug: 'instagram-creators-madrid',
    related: ['creadores-instagram-espana', 'creadores-tiktok-madrid', 'belleza-instagram-es'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en Madrid: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Madrid es el centro neurálgico del ecosistema creativo español. La concentración de agencias de medios, marcas de moda y empresas digitales en la capital ha producido una comunidad de creadores sofisticada con altos estándares de producción y amplia experiencia en colaboraciones de marca.',
        'El público de los creadores madrileños tiende a ser urbano, profesional y con un poder adquisitivo superior a la media nacional. Este perfil demográfico es especialmente valioso para marcas premium, tecnología, moda y lifestyle.',
        'Madrid ofrece unos backdrops de contenido únicos: la arquitectura histórica del centro, los barrios de moda como Malasaña y Chueca, los museos de clase mundial del Paseo del Arte y la vibrante escena gastronómica.',
        'Las colaboraciones con creadores madrileños funcionan especialmente bien para marcas que buscan posicionamiento premium en el mercado español. La asociación con la capital cultural y económica de España transmite credibilidad y aspiración que refuerza el posicionamiento de marca en todo el territorio nacional.',
      ],
    },
  },

  'creadores-tiktok-espana': {
    variant: 'es-ES',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Spain', 'Madrid', 'Barcelona'],
    locationLabel: 'España',
    title: 'Los Mejores Creadores de TikTok en España para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de TikTok verificados en España con datos reales de engagement. Los creadores españoles de TikTok producen contenido de moda, lifestyle, gastronomía y entretenimiento con alcance nacional e internacional.',
    englishSlug: 'tiktok-creators-spain',
    related: ['creadores-instagram-espana', 'creadores-tiktok-madrid', 'belleza-tiktok-es'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en España: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'España tiene una de las tasas de uso de TikTok más altas de Europa, con una comunidad de creadores que ha crecido exponencialmente en los últimos años. Los creadores españoles de TikTok han desarrollado formatos de contenido únicos que combinan la energía expresiva de la cultura española con la creatividad visual que define la plataforma.',
        'Las tasas de engagement en TikTok para creadores españoles oscilan entre el 5% y el 15%, significativamente superiores a Instagram en el mismo mercado. Los formatos más efectivos incluyen recetas y contenido gastronómico, fashion hauls, rutinas de belleza y entretenimiento de estilo de vida.',
        'El contenido de TikTok en español tiene una ventaja única: los 500 millones de hispanohablantes en todo el mundo son una audiencia potencial para cada vídeo. Un creador español de TikTok con 200.000 seguidores puede alcanzar audiencias en México, Colombia, Argentina y Estados Unidos simultáneamente.',
        'Para marcas que buscan lanzar campañas en el mercado hispanohablante, los creadores españoles de TikTok ofrecen un punto de partida estratégico: producen contenido con la calidad y el estilo europeo mientras hablan el idioma de todos los mercados hispanohablantes globalmente.',
      ],
    },
  },

  'creadores-tiktok-madrid': {
    variant: 'es-ES',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Madrid'],
    locationLabel: 'Madrid',
    title: 'Los Mejores Creadores de TikTok en Madrid para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de TikTok verificados en Madrid con datos reales de engagement. Madrid es el epicentro del TikTok español, con creadores de moda, belleza, gastronomía y entretenimiento de alta calidad.',
    englishSlug: 'tiktok-creators-spain',
    related: ['creadores-tiktok-espana', 'creadores-instagram-madrid'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en Madrid: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Madrid concentra la mayor densidad de creadores profesionales de TikTok de España. La capital atrae talento creativo de todo el país, resultando en una comunidad de creadores diversa y sofisticada que abarca todas las categorías de contenido principales.',
        'La escena gastronómica, de moda y cultural de Madrid proporciona a los creadores locales un flujo constante de contenido contextualmente relevante. Restaurantes de nueva apertura, pop-ups de moda y eventos culturales crean oportunidades naturales de integración de marca.',
        'Los creadores madrileños de TikTok tienen acceso a la infraestructura profesional de la capital: estudios de grabación, equipos de producción y agencias de talento. Esta infraestructura se refleja en la calidad del contenido.',
        'Para marcas que lanzan productos en el mercado español, una campaña con creadores de TikTok en Madrid crea un efecto de saturación en el mercado premium español: lo que es tendencia en Madrid típicamente se convierte en tendencia en el resto de España en semanas.',
      ],
    },
  },

  // ── Niche pages (Spain) ───────────────────────────────────────────────────

  'belleza-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'beauty',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Belleza en Instagram para Marcas (2026)',
    description: 'Descubre creadores de belleza verificados en Instagram con datos reales de engagement. Nuestra base de datos incluye especialistas en skincare, maquilladores y revisores de belleza con audiencias auténticas de 50K a 500K seguidores.',
    englishSlug: 'instagram-beauty-creators',
    related: ['belleza-tiktok-es', 'skincare-instagram-es', 'moda-instagram-es', 'creadores-instagram-espana'],
    educational: {
      heading: 'Trabajar con Influencers de Belleza en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de belleza de nivel medio (50K–500K seguidores) superan constantemente a los macro influencers en términos de conversión. Sus audiencias están genuinamente interesadas en contenido de belleza en lugar de cultura de celebridades, lo que lleva a tasas de engagement 2–4× más altas que las cuentas por encima del millón de seguidores.',
        'En el nicho de belleza, espera tasas de engagement auténticas del 3–8% en Instagram y del 5–12% en TikTok. Las audiencias de belleza responden especialmente bien a los Reels en formato tutorial, las stories de comparación de productos y el contenido de reseñas honestas — estos formatos impulsan las guardadas y los compartidos, que amplían el alcance orgánico.',
        'Los formatos de contenido más comunes incluyen vídeos Get Ready With Me (GRWM), unboxings, rutinas de skincare antes y después, y contenido de dupes de productos. Las marcas que dan libertad creativa y evitan mensajes guionizados ven un engagement un 40–60% mayor.',
        'Para el éxito de la campaña, proporciona los productos 3–4 semanas antes de la fecha de publicación, haz briefings para uso auténtico en lugar de endorsement, y considera campañas de múltiples publicaciones — las audiencias de belleza confían en los creadores que usan los productos a lo largo del tiempo.',
      ],
    },
  },

  'belleza-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'beauty',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Belleza en TikTok para Marcas (2026)',
    description: 'Encuentra creadores de belleza verificados en TikTok con audiencias auténticas y altamente comprometidas. Desde especialistas en #BeautyTok hasta creadores GRWM, encuentra influencers de belleza hispanohablantes con datos reales.',
    englishSlug: 'tiktok-beauty-creators',
    related: ['belleza-instagram-es', 'skincare-tiktok-es', 'moda-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Belleza en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha revolucionado el marketing de belleza. Los creadores de belleza hispanohablantes en TikTok producen contenido que genera millones de visualizaciones orgánicas — tutoriales de maquillaje, rutinas de skincare y reseñas de productos que se vuelven virales y establecen tendencias en todo el mercado hispanohablante.',
        'Las tasas de engagement en TikTok para creadores de belleza oscilan entre el 5% y el 12%, muy superiores a Instagram. El formato de vídeo corto es ideal para demostraciones de productos de belleza — antes y después, aplicaciones en tiempo real y transformaciones completas son los formatos de mayor rendimiento.',
        'El mercado de belleza hispanohablante es uno de los de más rápido crecimiento en el mundo. Los creadores de belleza en español tienen acceso a una audiencia potencial de más de 500 millones de personas — lo que convierte a cada colaboración de marca en una oportunidad de alcance genuinamente global.',
        'Las colaboraciones más efectivas en belleza en TikTok dan a los creadores libertad para integrar el producto en su formato de contenido natural. Evita los guiones estrictos — el contenido de belleza en TikTok que parece genuino supera al contenido claramente publicitario en una proporción de 3 a 1 en términos de engagement y conversión.',
      ],
    },
  },

  'moda-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'fashion',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Moda en Instagram para Marcas (2026)',
    description: 'Encuentra creadores de moda verificados en Instagram con audiencias auténticas. Nuestra base de datos cubre creadores de estilo hispanohablantes con 50K–500K seguidores listos para colaboraciones de marca.',
    englishSlug: 'instagram-fashion-creators',
    related: ['moda-tiktok-es', 'belleza-instagram-es', 'lifestyle-instagram-es', 'creadores-instagram-espana'],
    educational: {
      heading: 'Trabajar con Influencers de Moda en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los influencers de moda de nivel medio en el mercado hispanohablante tienden un puente entre el contenido aspiracional de alta moda y el estilo cotidiano. Con 50K–500K seguidores, son lo suficientemente accesibles como para que las audiencias los vean como iguales, no como celebridades — y las recomendaciones de compra tienen mucho más impacto.',
        'El contenido de moda en Instagram ve un engagement promedio del 2.5–5%, con los Reels y las publicaciones en carrusel generando la mayor interacción. Los formatos de desafío de estilo y las integraciones de temporada funcionan especialmente bien en el mercado hispanohablante.',
        'Las campañas de moda más efectivas incluyen briefings de desafío de estilo, integraciones de renovación de armario de temporada y contenido basado en eventos. Evita los briefings que requieren que los creadores abandonen su estética característica.',
        'Las campañas de gifting funcionan bien para accesorios y artículos de precio más bajo, pero para moda de lujo o lanzamientos de productos significativos, las asociaciones pagadas generan mejores resultados. Presupuesta 6–10 semanas para los plazos de producción.',
      ],
    },
  },

  'moda-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'fashion',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Moda en TikTok para Marcas (2026)',
    description: 'Descubre creadores de moda verificados en TikTok hispanohablantes. Nuestra base de datos cubre creadores de outfits, tendencias y estilo con datos reales de engagement.',
    englishSlug: 'tiktok-fashion-creators',
    related: ['moda-instagram-es', 'belleza-tiktok-es', 'lifestyle-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Moda en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha democratizado la moda en el mundo hispanohablante. Creadores de moda de Colombia, México, España y Argentina producen contenido de outfits, hauls y tendencias que genera millones de visualizaciones — llegando a audiencias que antes eran inaccesibles para las marcas de moda de presupuesto medio.',
        'Los formatos "Get The Look", los desafíos de estilo y las integraciones de temporada funcionan excepcionalmente bien en TikTok en español. Las audiencias de moda hispanohablantes en TikTok son especialmente receptivas al contenido que refleja tendencias locales — no solo tendencias europeas o norteamericanas importadas.',
        'La ventaja clave de TikTok para moda es la viralidad orgánica. Un creador de moda con 100K seguidores puede generar 2–5 millones de visualizaciones en un solo vídeo cuando el algoritmo lo amplifica — haciendo que el alcance potencial supere con creces el tamaño del seguidor.',
        'Para marcas de moda que buscan presencia en el mercado hispanohablante, TikTok ofrece el camino de entrada más eficiente en coste. Los costes de asociación con creadores hispanohablantes de TikTok son significativamente más bajos que los equivalentes norteamericanos o europeos, con tasas de engagement igualmente altas o superiores.',
      ],
    },
  },

  'fitness-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'fitness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Fitness en Instagram para Marcas (2026)',
    description: 'Conecta con creadores de fitness verificados en Instagram con datos reales de engagement. Nuestra base de datos cubre entrenadores personales, instructores de yoga y expertos en nutrición hispanohablantes.',
    englishSlug: 'instagram-fitness-creators',
    related: ['fitness-tiktok-es', 'wellness-instagram-es', 'lifestyle-instagram-es'],
    educational: {
      heading: 'Trabajar con Influencers de Fitness en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de fitness de nivel medio tienen algunas de las audiencias con mayor intención de compra de cualquier nicho. Sus seguidores están invirtiendo activamente en su salud — suplementos, equipamiento, ropa deportiva y apps convierten extremadamente bien.',
        'Espera tasas de engagement del 4–9% para contenido de fitness en Instagram y del 6–15% en TikTok. Los formatos de tutorial de entrenamiento, las historias de transformación y el contenido "lo que como en un día" tienen las mayores tasas de guardado.',
        'Los formatos de campaña que mejor funcionan: integración de productos en contenido de entrenamiento real, campañas de desafío de 30 días y narrativa de estilo atlético que posiciona al creador como alguien que genuinamente usa tu producto.',
        'Los picos estacionales son enero, primavera y septiembre. Reservar creadores con 8–12 semanas de antelación es esencial durante estos periodos.',
      ],
    },
  },

  'fitness-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'fitness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Fitness en TikTok para Marcas (2026)',
    description: 'Encuentra influencers de fitness verificados en TikTok con datos reales de engagement. Nuestra base de datos cubre creadores de gym, especialistas en entrenamiento en casa e influencers de nutrición deportiva hispanohablantes.',
    englishSlug: 'tiktok-fitness-influencers',
    related: ['fitness-instagram-es', 'wellness-tiktok-es', 'lifestyle-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Fitness en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los influencers de fitness hispanohablantes en TikTok tienen algunas de las tasas de engagement más altas en las redes sociales — entre el 6% y el 15% para los principales creadores. El formato de vídeo corto es perfecto para demostraciones de ejercicios, rutinas de entrenamiento y contenido de transformación que impulsa la acción.',
        'El mercado de fitness hispanohablante está en plena expansión. La conciencia sobre la salud y el bienestar está creciendo rápidamente en España, México, Colombia y el resto de América Latina — creando una audiencia masiva y creciente para productos de fitness, suplementos y ropa deportiva.',
        'Los formatos de mayor rendimiento en TikTok de fitness: rutinas de entrenamiento en casa (especialmente post-pandemia), recetas de comidas saludables, transformaciones de 30 días y consejos de nutrición. Las marcas que integran productos en estos formatos de forma natural ven tasas de conversión 3–5× superiores a los anuncios tradicionales.',
        'La estacionalidad del fitness en el mercado hispanohablante sigue patrones similares al global — enero, vuelta al cole en septiembre y pre-verano son los picos principales. Planifica las campañas con 8–12 semanas de antelación para estos momentos clave.',
      ],
    },
  },

  'lifestyle-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'lifestyle',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Lifestyle en Instagram para Marcas (2026)',
    description: 'Descubre creadores de lifestyle verificados en Instagram hispanohablantes. Nuestra base de datos incluye influencers de vida cotidiana, hogar, viajes y bienestar con audiencias auténticas de 50K a 500K seguidores.',
    englishSlug: 'instagram-lifestyle-creators',
    related: ['lifestyle-tiktok-es', 'belleza-instagram-es', 'fitness-instagram-es', 'creadores-instagram-espana'],
    educational: {
      heading: 'Trabajar con Influencers de Lifestyle en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de lifestyle son la categoría más versátil para las colaboraciones de marca. Su contenido abarca naturalmente el hogar, el bienestar, la moda, la gastronomía y los viajes — lo que los hace ideales para marcas que no encajan perfectamente en un solo nicho.',
        'Las tasas de engagement del lifestyle se sitúan en el 3–6% en Instagram y el 5–10% en TikTok. El contenido de formato largo "Un día en mi vida" y las publicaciones sobre decoración del hogar generan guardadas inusualmente altas.',
        'Las integraciones de marca más efectivas se sienten como adiciones naturales a la vida del creador. Los productos en contenido de "rutina matutina" o "actividades del fin de semana" tienen un 2–3× mejor recuerdo de marca que las publicaciones de reseña independientes.',
        'Los creadores de lifestyle suelen trabajar con múltiples marcas — verifica conflictos antes de firmar y considera cláusulas de exclusividad para tu categoría de producto.',
      ],
    },
  },

  'lifestyle-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'lifestyle',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Lifestyle en TikTok para Marcas (2026)',
    description: 'Encuentra creadores de lifestyle verificados en TikTok hispanohablantes con contenido auténtico de vida cotidiana. Nuestra base de datos incluye influencers de vlog, productividad y lifestyle cotidiano.',
    englishSlug: 'tiktok-lifestyle-creators',
    related: ['lifestyle-instagram-es', 'wellness-tiktok-es', 'moda-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Lifestyle en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de lifestyle hispanohablantes en TikTok documentan la vida real de una forma que resuena profundamente con sus audiencias. El formato "Un día en mi vida", las rutinas matutinas y el contenido de productividad generan millones de visualizaciones — y las integraciones de producto en estos formatos se sienten genuinas en lugar de publicitarias.',
        'La ventaja del lifestyle en TikTok es su versatilidad. Un solo creador de lifestyle puede integrar tu producto en múltiples contextos — mañanas, trabajo, tiempo libre, viajes — generando una variedad de contenido que refuerza el mensaje de marca desde múltiples ángulos.',
        'Las audiencias de lifestyle en TikTok en español son especialmente receptivas a productos que mejoran la calidad de vida cotidiana: organización del hogar, tecnología inteligente, cuidado personal, alimentación saludable y viajes. Si tu producto encaja en la vida diaria, los creadores de lifestyle hispanohablantes son los socios más naturales.',
        'Los creadores de lifestyle en TikTok que tienen entre 50K y 500K seguidores ofrecen el mejor equilibrio entre alcance y autenticidad para campañas en el mercado hispanohablante. Sus audiencias son lo suficientemente grandes para impulsar resultados medibles, pero lo suficientemente íntimas para que las recomendaciones de productos tengan un impacto genuino.',
      ],
    },
  },

  'skincare-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'skincare',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Skincare en Instagram para Marcas (2026)',
    description: 'Encuentra creadores de skincare verificados en Instagram hispanohablantes. Nuestra base de datos incluye esteticistas, especialistas en dermatología y entusiastas del cuidado de la piel con audiencias altamente comprometidas.',
    englishSlug: 'instagram-skincare-creators',
    related: ['skincare-tiktok-es', 'belleza-instagram-es', 'wellness-instagram-es'],
    educational: {
      heading: 'Trabajar con Influencers de Skincare en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El skincare es uno de los nichos de mayor confianza en las redes sociales hispanohablantes. Los creadores especializados en cuidado de la piel — esteticistas, entusiastas de la dermatología, revisores centrados en ingredientes — han construido audiencias que buscan activamente recomendaciones de productos y actúan en consecuencia.',
        'El público de skincare hispanohablante está altamente educado y es escéptico con las afirmaciones vagas. Los creadores que explican la ciencia detrás de los productos — ingredientes activos, diferencias de formulación, compatibilidad con tipos de piel — generan significativamente más conversiones que los que se basan únicamente en contenido estético.',
        'El contenido antes y después funciona excepcionalmente bien en skincare, pero requiere un manejo cuidadoso. Haz briefings a los creadores para documentar el uso genuino durante 4–6 semanas en lugar de comparaciones de una sola sesión. Las rutinas auténticas de 30 días superan ampliamente a las transformaciones de un día.',
        'Las mejores estructuras de campaña para marcas de skincare: integración de rutina (el creador añade tu producto a su rutina existente con comentarios honestos), inmersiones profundas en ingredientes y contenido de comparación. Evita las afirmaciones guionizadas — las directrices regulatorias son especialmente estrictas en el espacio del skincare y los cosméticos.',
      ],
    },
  },

  'skincare-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'skincare',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Skincare en TikTok para Marcas (2026)',
    description: 'Descubre creadores de skincare verificados en TikTok hispanohablantes. Nuestra base de datos incluye influencers de dermatología, esteticistas y entusiastas del cuidado de la piel con datos reales de engagement.',
    englishSlug: 'tiktok-skincare-creators',
    related: ['skincare-instagram-es', 'belleza-tiktok-es', 'wellness-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Skincare en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        '#SkincareTok en español es una de las comunidades más activas y comprometidas de TikTok. Los creadores hispanohablantes de skincare producen contenido que combina ciencia dermatológica con storytelling personal — generando vídeos que se vuelven virales mientras educan genuinamente a sus audiencias sobre el cuidado de la piel.',
        'Las tasas de engagement para creadores de skincare en TikTok en español oscilan entre el 6% y el 15%. El formato de vídeo corto es ideal para demostraciones de rutinas, reseñas de ingredientes y transformaciones de piel — exactamente el tipo de contenido que convierte espectadores en compradores.',
        'El público hispanohablante de skincare en TikTok está cada vez más sofisticado. Buscan activamente información sobre ingredientes como el retinol, el ácido hialurónico y la vitamina C — y confían en los creadores que hablan con conocimiento genuino sobre formulaciones y ciencia dermatológica.',
        'Para marcas de skincare que buscan penetración en el mercado hispanohablante, TikTok ofrece la ruta más eficiente. Los costes de asociación son accesibles, el alcance potencial es masivo y la naturaleza educativa del contenido de skincare alinea perfectamente con el formato de vídeo corto de la plataforma.',
      ],
    },
  },

  'wellness-instagram-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'wellness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Wellness en Instagram para Marcas (2026)',
    description: 'Conecta con creadores de wellness verificados en Instagram hispanohablantes. Nuestra base de datos cubre salud mental, mindfulness, yoga y vida holística con audiencias auténticas y comprometidas.',
    englishSlug: 'instagram-wellness-creators',
    related: ['wellness-tiktok-es', 'fitness-instagram-es', 'lifestyle-instagram-es'],
    educational: {
      heading: 'Trabajar con Influencers de Wellness en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El wellness es una de las categorías de creadores de más rápido crecimiento en el mercado hispanohablante. Los creadores de wellness de nivel medio generan una confianza significativa — a menudo mayor que la de las publicaciones de salud — porque los seguidores los ven como guías accesibles y cercanos en lugar de expertos distantes.',
        'El engagement del contenido de wellness se sitúa en el 4–8% en Instagram y el 6–14% en TikTok. Los formatos de "rutina matutina" y "lo que tomo cada día" generan la mayor consideración de producto de cualquier tipo de contenido en la categoría.',
        'Las marcas de suplementos, apps y servicios dominan esta categoría, pero los productos físicos de wellness también funcionan bien cuando se integran en contenido auténtico de rutina diaria. Evita los mensajes excesivamente comerciales — las audiencias de wellness son de las más escépticas con el contenido claramente publicitario.',
        'Las asociaciones de embajador a largo plazo superan consistentemente a las publicaciones patrocinadas puntuales en el espacio del wellness. Una relación de 6–12 meses con un creador de wellness de nivel medio construye una prueba social sostenida que convierte nuevos clientes y retiene a los existentes.',
      ],
    },
  },

  'wellness-tiktok-es': {
    variant: 'es-ES',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'wellness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Wellness en TikTok para Marcas (2026)',
    description: 'Descubre creadores de wellness verificados en TikTok hispanohablantes. Nuestra base de datos incluye creadores de yoga, salud mental, mindfulness y vida holística con datos reales de engagement.',
    englishSlug: 'tiktok-wellness-creators',
    related: ['wellness-instagram-es', 'fitness-tiktok-es', 'lifestyle-tiktok-es'],
    educational: {
      heading: 'Trabajar con Influencers de Wellness en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El wellness hispanohablante en TikTok ha experimentado un crecimiento explosivo en los últimos años. Los creadores de salud mental, meditación, yoga y nutrición producen contenido que combina información práctica con historias personales — generando comunidades de seguidores profundamente comprometidas que confían plenamente en sus recomendaciones.',
        'Las tasas de engagement para creadores de wellness en TikTok en español oscilan entre el 6% y el 14%. Los formatos de mayor rendimiento incluyen rutinas matutinas, hábitos de salud diarios y contenido educativo sobre bienestar — exactamente los contextos donde las integraciones de producto se sienten más naturales y auténticas.',
        'El mercado de wellness hispanohablante tiene características únicas: la cultura familiar mediterránea y latinoamericana valora profundamente el bienestar colectivo, no solo el individual. Los creadores que enmarcan los productos de wellness en el contexto del cuidado familiar y comunitario generan resonancia cultural adicional que los enfoques puramente individualistas no capturan.',
        'Para marcas de suplementos, apps de meditación, productos de yoga y herramientas de bienestar, los creadores de wellness hispanohablantes en TikTok ofrecen el canal de marketing más eficiente disponible. Sus audiencias son activamente receptivas a recomendaciones de productos que apoyan genuinamente su viaje de salud.',
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ES: Latin American Spanish Pages
// ─────────────────────────────────────────────────────────────────────────────

export const ES_PAGES: Record<string, EsPageConfig> = {

  // ── Location pages ────────────────────────────────────────────────────────

  'creadores-instagram-colombia': {
    variant: 'es',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Colombia'],
    locationLabel: 'Colombia',
    title: 'Los Mejores Creadores de Instagram en Colombia para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de Instagram verificados en Colombia con datos reales de engagement. Los creadores colombianos producen contenido de moda, belleza y lifestyle con audiencias altamente comprometidas.',
    englishSlug: 'instagram-creators-colombia',
    related: ['creadores-tiktok-colombia', 'creadores-instagram-mexico', 'belleza-instagram-latam'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en Colombia: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Colombia ha experimentado uno de los crecimientos más rápidos en el ecosistema de creadores de América Latina. La población joven y digitalmente nativa del país ha adoptado Instagram con un entusiasmo excepcional, creando un ecosistema de creadores dinámico, auténtico y con una influencia internacional en rápido crecimiento.',
        'Los creadores colombianos de Instagram son particularmente fuertes en belleza, moda, lifestyle y entretenimiento. La confianza cultural y la creatividad de Colombia producen contenido que se destaca internacionalmente — especialmente en el mercado hispano de Estados Unidos y en el sur de Europa.',
        'Las tasas de engagement de los creadores colombianos oscilan entre el 4% y el 9%, superiores a la media latinoamericana. Las audiencias colombianas forman seguidores profundamente leales alrededor de los creadores con los que conectan.',
        'Para marcas que buscan entrar en el mercado colombiano, las colaboraciones con creadores son esenciales. El marketing de creadores es la principal forma en que los consumidores jóvenes colombianos descubren nuevas marcas y toman decisiones de compra.',
      ],
    },
  },

  'creadores-tiktok-colombia': {
    variant: 'es',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Colombia'],
    locationLabel: 'Colombia',
    title: 'Los Mejores Creadores de TikTok en Colombia para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de TikTok verificados en Colombia con datos reales de engagement. Colombia tiene una de las comunidades de TikTok más activas de América Latina con creadores de moda, belleza y entretenimiento.',
    englishSlug: 'tiktok-creators-colombia',
    related: ['creadores-instagram-colombia', 'creadores-tiktok-mexico', 'belleza-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en Colombia: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha transformado el panorama de los creadores en Colombia. La plataforma ha democratizado la creación de contenido, permitiendo que creadores de Medellín, Cali, Bogotá y ciudades secundarias construyan audiencias masivas.',
        'Los creadores colombianos de TikTok tienen tasas de engagement entre las más altas de América Latina — entre el 6% y el 15%. El contenido colombiano se caracteriza por su energía, creatividad y conexión cultural genuina.',
        'La particularidad de los creadores colombianos de TikTok es su autenticidad cultural: hablan el español coloquial latinoamericano que resuena en todo el continente. Un creador colombiano puede llegar efectivamente a audiencias en México, Perú, Chile y Argentina simultáneamente.',
        'El coste-eficiencia de las colaboraciones con creadores colombianos de TikTok es uno de los mayores atractivos del mercado. La calidad de producción es comparable a los estándares de América del Norte, mientras que los costes de asociación reflejan un mercado en desarrollo.',
      ],
    },
  },

  'creadores-instagram-mexico': {
    variant: 'es',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Mexico', 'México'],
    locationLabel: 'México',
    title: 'Los Mejores Creadores de Instagram en México para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de Instagram verificados en México con datos reales de engagement. México tiene uno de los mercados de creadores más grandes de América Latina con contenido líder en moda, gastronomía, belleza y lifestyle.',
    englishSlug: 'instagram-creators-mexico',
    related: ['creadores-tiktok-mexico', 'creadores-instagram-colombia', 'belleza-instagram-latam'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en México: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'México es la segunda economía más grande de América Latina y uno de los diez principales mercados de redes sociales del mundo. Los creadores mexicanos han construido una economía de creadores de escala genuina con influencia que se extiende al mercado hispano de Estados Unidos.',
        'El contenido de los creadores mexicanos abarca una enorme variedad de estilos y categorías, reflejando la diversidad cultural del país. Desde Ciudad de México hasta las regiones costeras, el ecosistema ofrece oportunidades de alineación para prácticamente cualquier categoría de producto.',
        'El corredor cultural México-Estados Unidos es uno de los más significativos en la economía de creadores. Muchos creadores mexicanos tienen grandes seguidores entre los 60 millones de hispanos en Estados Unidos.',
        'Belleza, gastronomía, familia y lifestyle son las categorías de mejor rendimiento en México. Las marcas que comprenden y respetan los valores culturales mexicanos en sus briefings superan consistentemente a las que simplemente adaptan plantillas no mexicanas.',
      ],
    },
  },

  'creadores-tiktok-mexico': {
    variant: 'es',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Mexico', 'México'],
    locationLabel: 'México',
    title: 'Los Mejores Creadores de TikTok en México para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de TikTok verificados en México con datos reales de engagement. México cuenta con una de las comunidades de TikTok más grandes de América Latina con creadores líderes en entretenimiento, moda y lifestyle.',
    englishSlug: 'tiktok-creators-mexico',
    related: ['creadores-instagram-mexico', 'creadores-tiktok-colombia', 'belleza-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en México: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'México es uno de los mercados de TikTok más grandes y activos de América Latina. Los creadores mexicanos han desarrollado formatos únicos que generan regularmente millones de reproducciones y establecen tendencias en todo el continente hispanohablante.',
        'Las tasas de engagement de los creadores mexicanos de TikTok están entre las más altas de América Latina, oscilando entre el 7% y el 18%. El humor, la comida, la música y las tradiciones mexicanas tienen reconocimiento global que amplifica el alcance orgánico.',
        'La dinámica México-Estados Unidos crea oportunidades únicas. Los creadores mexicanos con seguidores en ambos lados de la frontera pueden servir como puentes culturales para marcas que buscan alcanzar simultáneamente ambos mercados.',
        'Para marcas en alimentación, moda, belleza y entretenimiento, los creadores mexicanos de TikTok ofrecen autenticidad cultural que los creadores internacionales no pueden replicar.',
      ],
    },
  },

  'creadores-instagram-peru': {
    variant: 'es',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Peru'],
    locationLabel: 'Perú',
    title: 'Los Mejores Creadores de Instagram en Perú para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de Instagram verificados en Perú con datos reales de engagement. Los creadores peruanos producen contenido auténtico de gastronomía, moda y lifestyle con audiencias altamente comprometidas.',
    englishSlug: 'tiktok-creators-peru',
    related: ['creadores-tiktok-peru', 'creadores-instagram-colombia', 'creadores-instagram-chile'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en Perú: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Perú es uno de los mercados emergentes más emocionantes para creadores en América Latina. La gastronomía peruana — reconocida internacionalmente — ha creado una categoría de creadores de contenido gastronómico excepcionalmente fuerte.',
        'Los creadores peruanos abarcan una diversidad cultural única: costa, sierra y selva producen estilos de vida, estéticas y contenidos radicalmente diferentes. Esta diversidad ofrece a las marcas contextos de contenido auténticos que pocas otras naciones pueden igualar.',
        'Las tasas de engagement de los creadores peruanos oscilan entre el 4% y el 8%. El público peruano forma lealtades fuertes con los creadores que representan auténticamente la cultura y los valores locales.',
        'Para marcas que buscan establecerse en el mercado peruano, los creadores peruanos ofrecen un punto de entrada coste-eficiente con alcance cultural que se extiende a Bolivia, Ecuador y las comunidades andinas de otros países latinoamericanos.',
      ],
    },
  },

  'creadores-tiktok-peru': {
    variant: 'es',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Peru'],
    locationLabel: 'Perú',
    title: 'Los Mejores Creadores de TikTok en Perú para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de TikTok verificados en Perú con datos reales de engagement. Perú tiene una comunidad de TikTok en rápido crecimiento con creadores destacados en gastronomía, moda y lifestyle.',
    englishSlug: 'tiktok-creators-peru',
    related: ['creadores-instagram-peru', 'creadores-tiktok-colombia', 'creadores-tiktok-chile'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en Perú: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha crecido explosivamente en Perú. Los creadores peruanos han encontrado en la plataforma un espacio donde la riqueza cultural del país — gastronomía, música, danza, tradiciones regionales — se convierte en contenido viral que trasciende fronteras.',
        'El contenido gastronómico peruano en TikTok tiene un alcance global desproporcionado. Los platos icónicos como el ceviche y el lomo saltado generan curiosidad de audiencias en todo el mundo.',
        'Las tasas de engagement de los creadores peruanos de TikTok están entre las más altas de la región andina, reflejando comunidades de seguidores apasionadas y activas.',
        'El coste-eficiencia de las colaboraciones con creadores peruanos de TikTok es una ventaja competitiva significativa. Los mejores creadores peruanos producen contenido de alta calidad a costes que reflejan un mercado en desarrollo.',
      ],
    },
  },

  'creadores-instagram-chile': {
    variant: 'es',
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Chile'],
    locationLabel: 'Chile',
    title: 'Los Mejores Creadores de Instagram en Chile para Colaboraciones de Marca (2026)',
    description: 'Encuentra creadores de Instagram verificados en Chile con datos reales de engagement. Chile tiene el mercado de consumo más sofisticado de América del Sur con creadores de moda, lifestyle y wellness de alta calidad.',
    englishSlug: 'tiktok-creators-chile',
    related: ['creadores-tiktok-chile', 'creadores-instagram-colombia', 'belleza-instagram-latam'],
    educational: {
      heading: 'Trabajar con Creadores de Instagram en Chile: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Chile es el mercado de consumo más desarrollado de América Latina con uno de los niveles de ingreso per cápita más altos. Las audiencias chilenas son consumidores conscientes de la marca y orientados a la calidad con poder adquisitivo superior a la media latinoamericana.',
        'Los creadores chilenos han desarrollado una estética de contenido que combina influencias europeas con identidad latinoamericana. Esta dualidad cultural produce contenido que resuena tanto con audiencias locales como con el mercado hispanohablante internacional.',
        'La diversidad geográfica de Chile proporciona a los creadores locales acceso a backdrops visuales únicos: desierto de Atacama, viñedos, Patagonia.',
        'Chile tiene sólidas relaciones comerciales internacionales. Los creadores chilenos son especialmente efectivos para marcas internacionales que buscan un punto de entrada sofisticado en el mercado latinoamericano.',
      ],
    },
  },

  'creadores-tiktok-chile': {
    variant: 'es',
    type: 'location',
    platform: 'tiktok',
    locationMatch: ['Chile'],
    locationLabel: 'Chile',
    title: 'Los Mejores Creadores de TikTok en Chile para Colaboraciones de Marca (2026)',
    description: 'Descubre creadores de TikTok verificados en Chile con datos reales de engagement. La comunidad chilena de TikTok es una de las más dinámicas de América del Sur con creadores de lifestyle, moda y entretenimiento.',
    englishSlug: 'tiktok-creators-chile',
    related: ['creadores-instagram-chile', 'creadores-tiktok-colombia', 'creadores-tiktok-peru'],
    educational: {
      heading: 'Trabajar con Creadores de TikTok en Chile: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Chile tiene una de las tasas de penetración de internet más altas de América Latina. Los creadores chilenos de TikTok producen contenido con estándares de calidad que se acercan a los niveles norteamericanos.',
        'La escena de TikTok chilena se distingue por su creatividad y diversidad de categorías: gastronomía, moda con influencia europea, fitness y lifestyle de alta calidad.',
        'Los creadores chilenos de TikTok son particularmente efectivos para marcas en tecnología, productos premium, gastronomía y turismo. La audiencia chilena tiene un nivel de educación y poder adquisitivo superior a la media latinoamericana.',
        'La posición de Chile en el Cono Sur lo convierte en un mercado estratégico para marcas que buscan expandirse por América del Sur hacia Argentina, Uruguay y Paraguay.',
      ],
    },
  },

  // ── Niche pages (LatAm) ───────────────────────────────────────────────────

  'belleza-instagram-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'beauty',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Belleza en Instagram de América Latina (2026)',
    description: 'Descubre creadores de belleza latinoamericanos verificados en Instagram con datos reales de engagement. Nuestra base de datos incluye influencers de skincare, maquillaje y belleza con audiencias auténticas de 50K a 500K seguidores.',
    englishSlug: 'instagram-beauty-creators',
    related: ['belleza-tiktok-latam', 'moda-instagram-latam', 'creadores-instagram-colombia', 'creadores-instagram-mexico'],
    educational: {
      heading: 'Trabajar con Influencers de Belleza Latinoamericanos en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'América Latina tiene uno de los mercados de belleza de más rápido crecimiento del mundo. Los creadores de belleza latinoamericanos en Instagram han construido comunidades altamente comprometidas que son pioneras en tendencias de belleza que después se adoptan globalmente — especialmente en categorías como cuidado del cabello, maquillaje vibrante y skincare para pieles de color.',
        'Las tasas de engagement de los creadores de belleza latinoamericanos oscilan entre el 4% y el 10% en Instagram, superiores a la media global. Las audiencias latinoamericanas de belleza son especialmente activas en los comentarios — preguntan sobre productos, comparten recomendaciones alternativas y forman comunidades genuinas alrededor de los creadores que siguen.',
        'El mercado de belleza latinoamericano tiene características únicas que los briefings de marca deben respetar: las necesidades de cuidado de la piel reflejan climas tropicales y subtropicales, las referencias de tono de piel deben ser inclusivas y representativas, y el valor percibido es un factor de compra importante en mercados con mayor sensibilidad al precio.',
        'Para marcas de belleza que buscan penetración en América Latina, los creadores de Instagram son el canal de marketing más efectivo disponible. Las recomendaciones boca a boca digitales a través de creadores de confianza superan consistentemente a la publicidad tradicional en conversión y coste por adquisición en todos los mercados latinoamericanos principales.',
      ],
    },
  },

  'belleza-tiktok-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'beauty',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Belleza en TikTok de América Latina (2026)',
    description: 'Encuentra creadores de belleza latinoamericanos verificados en TikTok con audiencias altamente comprometidas. Descubre influencers de maquillaje, skincare y belleza hispanohablantes con datos reales.',
    englishSlug: 'tiktok-beauty-creators',
    related: ['belleza-instagram-latam', 'moda-tiktok-latam', 'creadores-tiktok-colombia', 'creadores-tiktok-mexico'],
    educational: {
      heading: 'Trabajar con Influencers de Belleza Latinoamericanos en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha revolucionado el mercado de belleza latinoamericano. Los creadores de belleza de Colombia, México, Perú, Chile y Argentina producen contenido viral que establece tendencias en todo el mundo hispanohablante — y cada vez más, influye en tendencias de belleza globales.',
        'Las tasas de engagement para creadores de belleza latinoamericanos en TikTok oscilan entre el 6% y el 15%, entre las más altas de cualquier mercado geográfico. La naturaleza visual y demostrativa del contenido de belleza encaja perfectamente con el formato de vídeo corto de TikTok — antes y después, tutoriales en tiempo real y transformaciones completas son los formatos de mayor rendimiento.',
        'El mercado de belleza latinoamericano en TikTok tiene una dinámica única: los creadores actúan simultáneamente como editores de tendencias, educadores de productos y validadores de marca. Una reseña positiva de un creador de belleza de confianza en TikTok puede agotar el stock de un producto en días en múltiples países latinoamericanos.',
        'Para marcas de belleza que buscan eficiencia máxima en América Latina, los creadores de TikTok ofrecen el mejor retorno de inversión disponible: costes de asociación accesibles, tasas de engagement excepcionales y alcance que se extiende orgánicamente más allá del país de origen del creador hacia todo el mercado hispanohablante.',
      ],
    },
  },

  'moda-instagram-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'fashion',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Moda en Instagram de América Latina (2026)',
    description: 'Encuentra creadores de moda latinoamericanos verificados en Instagram con audiencias auténticas. Nuestra base de datos cubre creadores de estilo de Colombia, México, Chile y más con 50K–500K seguidores.',
    englishSlug: 'instagram-fashion-creators',
    related: ['moda-tiktok-latam', 'belleza-instagram-latam', 'lifestyle-instagram-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Moda Latinoamericanos en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'La moda latinoamericana tiene una identidad visual única que combina influencias indígenas, europeas y contemporáneas en una estética distintiva. Los creadores de moda latinoamericanos en Instagram han desarrollado estilos propios que son reconocibles y genuinamente influyentes — no simples imitaciones de tendencias norteamericanas o europeas.',
        'Las tasas de engagement para creadores de moda latinoamericanos en Instagram oscilan entre el 3% y el 7%. Las audiencias latinoamericanas de moda son especialmente receptivas a los contenidos que mezclan aspiración con accesibilidad — prendas de alta gama combinadas con opciones más asequibles, outfits para diferentes presupuestos y estilos adaptados a los climas y culturas locales.',
        'Los mercados de moda más activos de América Latina son México, Colombia, Argentina y Chile — cada uno con una identidad estética propia. Los creadores mexicanos tienden hacia estilos vibrantes con influencias culturales locales; los colombianos destacan en moda urbana contemporánea; los argentinos tienen una fuerte tradición de moda europea; los chilenos combinan sofisticación con practicidad.',
        'Para marcas de moda que buscan presencia en América Latina, la estrategia más efectiva es trabajar con creadores de múltiples países simultáneamente — reflejando la diversidad del mercado y evitando la percepción de favoritismo regional que puede surgir de campañas concentradas en un solo país.',
      ],
    },
  },

  'moda-tiktok-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'fashion',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Moda en TikTok de América Latina (2026)',
    description: 'Descubre creadores de moda latinoamericanos verificados en TikTok con datos reales de engagement. Nuestra base de datos cubre outfits, tendencias y estilo con creadores hispanohablantes de alta calidad.',
    englishSlug: 'tiktok-fashion-creators',
    related: ['moda-instagram-latam', 'belleza-tiktok-latam', 'lifestyle-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Moda Latinoamericanos en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'TikTok ha democratizado el acceso a la moda en América Latina de una manera sin precedentes. Creadores de ciudades secundarias de Colombia, México y Perú ahora tienen audiencias millonarias — rompiendo el monopolio que las capitales y los grandes centros urbanos tenían sobre la influencia en moda.',
        'Los formatos de moda más virales en TikTok latinoamericano incluyen hauls de compras, "outfit of the day" con múltiples opciones de precio, transformaciones de estilo y contenido de tendencias adaptadas al clima y cultura local. Los creadores que conectan tendencias globales con contextos latinoamericanos locales consistentemente superan a los que simplemente replican contenido de tendencias internacionales.',
        'La particularidad del mercado de moda latinoamericano en TikTok es su diversidad de poder adquisitivo. Los creadores que abordan múltiples rangos de precio — mostrando tanto opciones premium como alternativas accesibles — generan audiencias más grandes y más diversas que los que se concentran exclusivamente en moda de lujo o en moda económica.',
        'Para marcas internacionales de moda que buscan entrar en América Latina, los creadores de TikTok ofrecen la ruta más eficiente y auténtica. El contenido nativo latinoamericano en TikTok supera consistentemente al contenido adaptado o traducido — las audiencias valoran a los creadores que hablan su idioma cultural, no solo su idioma literal.',
      ],
    },
  },

  'fitness-instagram-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'fitness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Fitness en Instagram de América Latina (2026)',
    description: 'Conecta con creadores de fitness latinoamericanos verificados en Instagram. Nuestra base de datos cubre entrenadores, instructores de yoga y expertos en nutrición hispanohablantes con datos reales de engagement.',
    englishSlug: 'instagram-fitness-creators',
    related: ['fitness-tiktok-latam', 'wellness-instagram-latam', 'lifestyle-instagram-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Fitness Latinoamericanos en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El mercado de fitness latinoamericano está en plena expansión. La conciencia sobre la salud y el bienestar físico está creciendo rápidamente en toda la región, impulsada por el aumento de la clase media, el acceso a smartphones y la influencia de los creadores de contenido de fitness que documentan sus propios viajes de transformación.',
        'Los creadores de fitness latinoamericanos en Instagram tienen tasas de engagement del 4–9%, reflejando comunidades de seguidores activos que están buscando activamente inspiración y guía para sus propios objetivos de fitness. Este nivel de intención de compra hace que las audiencias de fitness sean especialmente valiosas para marcas de suplementos, ropa deportiva, equipamiento y apps.',
        'La cultura del fitness en América Latina tiene características propias que las marcas deben entender. El fitness latinoamericano combina disciplinas como el fútbol, el baile, las artes marciales y deportes tradicionales con el gym moderno — los creadores que abordan esta diversidad generan audiencias más amplias y comprometidas que los que se concentran exclusivamente en el gimnasio occidental convencional.',
        'Para marcas de fitness que buscan presencia en América Latina, la estrategia de creadores es más efectiva cuando combina creadores de nivel micro (50K–100K) con presencia geográfica específica y creadores de nivel medio (100K–300K) con alcance regional más amplio. Esta combinación maximiza tanto la relevancia local como el alcance regional.',
      ],
    },
  },

  'fitness-tiktok-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'fitness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Fitness en TikTok de América Latina (2026)',
    description: 'Encuentra influencers de fitness latinoamericanos verificados en TikTok con datos reales de engagement. Nuestra base de datos cubre creadores de gym, entrenamiento en casa y nutrición deportiva hispanohablantes.',
    englishSlug: 'tiktok-fitness-influencers',
    related: ['fitness-instagram-latam', 'wellness-tiktok-latam', 'lifestyle-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Fitness Latinoamericanos en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los influencers de fitness hispanohablantes en TikTok tienen algunas de las tasas de engagement más altas en las redes sociales — entre el 6% y el 15% para los principales creadores. El formato de vídeo corto es perfecto para demostraciones de ejercicios, rutinas y contenido de transformación que impulsa la acción.',
        'Los formatos de mayor rendimiento en TikTok de fitness latinoamericano incluyen rutinas de entrenamiento rápidas (perfectas para el estilo de vida urbano ocupado), recetas de comidas saludables y económicas, y transformaciones de 30 días que documentan el proceso con honestidad.',
        'La estacionalidad del fitness en América Latina sigue patrones que difieren del mercado norteamericano. El pre-verano (octubre-noviembre en el hemisferio sur, marzo-abril en el norte) y el comienzo del año son los picos principales. Los creadores que planifican campañas alrededor de estas ventanas estacionales generan resultados significativamente superiores.',
        'Para marcas de suplementos, ropa deportiva y apps de fitness, los creadores latinoamericanos de TikTok ofrecen el canal de marketing con mejor relación coste-resultado disponible en el mercado. Sus audiencias tienen intención de compra activa y confían en las recomendaciones de los creadores que siguen.',
      ],
    },
  },

  'lifestyle-instagram-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'lifestyle',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Lifestyle en Instagram de América Latina (2026)',
    description: 'Descubre creadores de lifestyle latinoamericanos verificados en Instagram. Nuestra base de datos incluye influencers de vida cotidiana, hogar, viajes y bienestar hispanohablantes con audiencias auténticas.',
    englishSlug: 'instagram-lifestyle-creators',
    related: ['lifestyle-tiktok-latam', 'belleza-instagram-latam', 'fitness-instagram-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Lifestyle Latinoamericanos en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de lifestyle latinoamericanos son los socios de marca más versátiles del ecosistema de creadores hispanohablante. Su contenido abarca naturalmente el hogar, el bienestar, la moda, la gastronomía y los viajes — con una perspectiva cultural latinoamericana que resuena auténticamente con las audiencias de la región.',
        'Las tasas de engagement del lifestyle latinoamericano en Instagram se sitúan en el 3–7%, superiores a la media global para esta categoría. El contenido de "día en la vida", las rutinas domésticas y los viajes dentro de América Latina generan guardadas inusualmente altas — señal de que las audiencias valoran el contenido como referencia para sus propias vidas.',
        'El lifestyle latinoamericano tiene características culturales propias que las marcas deben integrar en sus briefings. La familia y la comunidad son valores centrales — los productos posicionados en el contexto del bienestar familiar o de la mejora del hogar familiar tienen 2–3× mejor recuerdo de marca que los posicionados puramente en el consumo individual.',
        'Para marcas de hogar, tecnología doméstica, alimentación y viajes domésticos, los creadores de lifestyle latinoamericanos ofrecen acceso a consumidores que toman decisiones de compra complejas y de alto valor. Sus audiencias no solo guardan contenido — actúan en consecuencia.',
      ],
    },
  },

  'lifestyle-tiktok-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'lifestyle',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Lifestyle en TikTok de América Latina (2026)',
    description: 'Encuentra creadores de lifestyle latinoamericanos verificados en TikTok con contenido auténtico de vida cotidiana. Nuestra base de datos incluye influencers de vlog, productividad y lifestyle cotidiano hispanohablantes.',
    englishSlug: 'tiktok-lifestyle-creators',
    related: ['lifestyle-instagram-latam', 'wellness-tiktok-latam', 'moda-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Lifestyle Latinoamericanos en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'Los creadores de lifestyle latinoamericanos en TikTok documentan la vida real con una autenticidad que resuena profundamente con sus audiencias. El formato "Un día en mi vida", las rutinas matutinas adaptadas al clima y la cultura local, y el contenido de organización del hogar generan millones de visualizaciones y construcciones de comunidad genuinas.',
        'La ventaja del lifestyle en TikTok latinoamericano es su capacidad para hacer que los productos parezcan parte natural de la vida cotidiana. Las integraciones de marca en rutinas, recetas y actividades familiares se perciben como recomendaciones genuinas, no publicidad — la diferencia en tasas de conversión puede ser de 3 a 5×.',
        'El contenido de lifestyle latinoamericano en TikTok tiene una particularidad valiosa para las marcas: su naturaleza aspiracional pero accesible. Los creadores muestran vidas deseables pero alcanzables — lo que activa la intención de compra mejor que el contenido de lujo inalcanzable.',
        'Para marcas de consumo masivo, tecnología del hogar, alimentación y cuidado personal, los creadores de lifestyle latinoamericanos en TikTok son los socios más naturales y efectivos del ecosistema.',
      ],
    },
  },

  'wellness-instagram-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'instagram',
    searchKeyword: 'wellness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Wellness en Instagram de América Latina (2026)',
    description: 'Conecta con creadores de wellness latinoamericanos verificados en Instagram. Nuestra base de datos cubre salud mental, mindfulness, yoga y vida holística hispanohablante con audiencias comprometidas.',
    englishSlug: 'instagram-wellness-creators',
    related: ['wellness-tiktok-latam', 'fitness-instagram-latam', 'lifestyle-instagram-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Wellness Latinoamericanos en Instagram: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El wellness latinoamericano tiene raíces culturales profundas — las tradiciones de medicina natural, los rituales de cuidado personal y la conexión con la naturaleza son parte intrínseca de las culturas de la región. Los creadores de wellness latinoamericanos conectan estas tradiciones con las prácticas de bienestar modernas, creando contenido con una autenticidad cultural única.',
        'Las tasas de engagement del wellness en Instagram latinoamericano oscilan entre el 4% y el 9%, superiores a la media global de la categoría. Las audiencias latinoamericanas de wellness son especialmente activas en los comentarios — comparten experiencias personales, hacen preguntas detalladas sobre productos y forman comunidades de apoyo genuinas.',
        'El mercado de wellness latinoamericano tiene una característica diferenciadora: la integración del wellness individual con el bienestar familiar y comunitario. Los productos de wellness que se posicionan en el contexto del cuidado de la familia — no solo del individuo — tienen una resonancia cultural adicional que amplifica significativamente el impacto de la campaña.',
        'Para marcas de suplementos, productos naturales, apps de meditación y herramientas de bienestar, los creadores latinoamericanos de Instagram ofrecen acceso a un mercado de consumidores sofisticados que combinan el interés en prácticas de wellness modernas con el respeto por la sabiduría tradicional latinoamericana.',
      ],
    },
  },

  'wellness-tiktok-latam': {
    variant: 'es',
    type: 'niche',
    platform: 'tiktok',
    searchKeyword: 'wellness',
    spanishCountriesOnly: true,
    title: 'Los Mejores Influencers de Wellness en TikTok de América Latina (2026)',
    description: 'Descubre creadores de wellness latinoamericanos verificados en TikTok. Nuestra base de datos incluye creadores de yoga, salud mental, mindfulness y vida holística hispanohablantes con datos reales.',
    englishSlug: 'tiktok-wellness-creators',
    related: ['wellness-instagram-latam', 'fitness-tiktok-latam', 'lifestyle-tiktok-latam'],
    educational: {
      heading: 'Trabajar con Influencers de Wellness Latinoamericanos en TikTok: Lo Que las Marcas Necesitan Saber',
      paragraphs: [
        'El wellness hispanohablante en TikTok ha experimentado un crecimiento explosivo. Los creadores de salud mental, meditación, yoga y nutrición latinoamericanos producen contenido que combina información práctica con historias personales — generando comunidades de seguidores profundamente comprometidas.',
        'Las tasas de engagement para creadores de wellness latinoamericanos en TikTok oscilan entre el 6% y el 14%. Los formatos de rutinas matutinas, hábitos saludables diarios y contenido educativo sobre bienestar son los de mayor rendimiento.',
        'El wellness latinoamericano en TikTok tiene una dimensión comunitaria única. Los creadores que abordan el bienestar en el contexto de la familia y la comunidad — no solo el desarrollo personal individual — generan resonancia cultural adicional que amplifica orgánicamente el alcance del contenido.',
        'Para marcas de suplementos, apps de meditación, productos de yoga y herramientas de bienestar, los creadores latinoamericanos de TikTok ofrecen el canal de marketing más eficiente en el mercado hispanohablante.',
      ],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

export function getEsPageConfig(slug: string, variant: EsVariant): EsPageConfig | null {
  if (variant === 'es-ES') return ES_ES_PAGES[slug] ?? null;
  return ES_PAGES[slug] ?? null;
}

export function getAllEsSlugs(variant: EsVariant): string[] {
  if (variant === 'es-ES') return Object.keys(ES_ES_PAGES);
  return Object.keys(ES_PAGES);
}
