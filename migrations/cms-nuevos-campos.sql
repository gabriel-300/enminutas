-- Migración: nuevos campos CMS para canales, categorías, producto destacado y B2B
-- Ejecutar en Supabase SQL Editor

INSERT INTO contenido_web (clave, seccion, etiqueta, tipo) VALUES

-- Sección canales de venta (las 3 tarjetas debajo del hero)
('canales_kicker',     'canales', '¿Cómo pedís? (kicker sobre el título)',        'text'),
('canales_titulo',     'canales', 'Título de la sección',                          'text'),
('canal_1_titulo',     'canales', 'Tarjeta 1 — Título (WhatsApp)',                 'text'),
('canal_1_subtitulo',  'canales', 'Tarjeta 1 — Subtítulo',                         'text'),
('canal_1_desc',       'canales', 'Tarjeta 1 — Descripción',                       'textarea'),
('canal_1_cta',        'canales', 'Tarjeta 1 — Texto del botón',                   'text'),
('canal_2_titulo',     'canales', 'Tarjeta 2 — Título (Catálogo)',                  'text'),
('canal_2_subtitulo',  'canales', 'Tarjeta 2 — Subtítulo',                         'text'),
('canal_2_desc',       'canales', 'Tarjeta 2 — Descripción',                       'textarea'),
('canal_2_cta',        'canales', 'Tarjeta 2 — Texto del botón',                   'text'),
('canal_3_titulo',     'canales', 'Tarjeta 3 — Título (Mayoristas)',                'text'),
('canal_3_subtitulo',  'canales', 'Tarjeta 3 — Subtítulo',                         'text'),
('canal_3_desc',       'canales', 'Tarjeta 3 — Descripción',                       'textarea'),
('canal_3_cta',        'canales', 'Tarjeta 3 — Texto del botón',                   'text'),

-- Sección categorías
('categorias_kicker',  'categorias', 'Kicker sobre el título (ej: Líneas de producto)', 'text'),
('categorias_titulo',  'categorias', 'Título de la sección',                            'text'),

-- Producto destacado (campos adicionales)
('featured_badge',     'producto_destacado', 'Etiqueta badge (ej: Producto insignia)',     'text'),
('featured_linea_href','producto_destacado', 'Link "Ver toda la línea" (ej: /tienda?categoria=rebozados)', 'text'),
('featured_linea_cta', 'producto_destacado', 'Texto del link "Ver toda la línea"',          'text'),

-- B2B (campo adicional)
('b2b_cta_text',       'b2b', 'Texto del botón WhatsApp (ej: Consultar condiciones)',      'text')

ON CONFLICT (clave) DO NOTHING;
