CREATE TABLE IF NOT EXISTS categorias_insumos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     text NOT NULL,
  valor      text NOT NULL UNIQUE,
  color      text NOT NULL DEFAULT 'bg-neutral-100 text-neutral-500',
  orden      int  NOT NULL DEFAULT 99,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON TABLE categorias_insumos TO anon, authenticated, service_role;

INSERT INTO categorias_insumos (nombre, valor, color, orden) VALUES
  ('Verduras',         'verduras',        'bg-green-100 text-green-700',    1),
  ('Frutas',           'frutas',          'bg-orange-100 text-orange-700',  2),
  ('Carnes',           'carnes',          'bg-red-100 text-red-700',        3),
  ('Lácteos',          'lacteos',         'bg-sky-100 text-sky-700',        4),
  ('Panificados',      'panificados',     'bg-amber-100 text-amber-700',    5),
  ('Condimentos',      'condimentos',     'bg-purple-100 text-purple-700',  6),
  ('Aceites y grasas', 'aceites_grasas',  'bg-yellow-100 text-yellow-700',  7),
  ('Bebidas',          'bebidas',         'bg-cyan-100 text-cyan-700',      8),
  ('Otros',            'otros',           'bg-neutral-100 text-neutral-500', 99)
ON CONFLICT (valor) DO NOTHING;
