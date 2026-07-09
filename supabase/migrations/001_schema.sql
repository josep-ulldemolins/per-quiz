-- PER Quiz Database Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com)

-- Drop existing tables (if re-running)
DROP TABLE IF EXISTS resultados_test CASCADE;
DROP TABLE IF EXISTS preguntas CASCADE;
DROP TABLE IF EXISTS examenes CASCADE;

-- Table: examenes
CREATE TABLE examenes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  version SMALLINT NOT NULL CHECK (version IN (1, 2)),
  fecha DATE,
  lugar VARCHAR(50),
  clave VARCHAR(20),
  archivo_origen VARCHAR(100),
  total_preguntas SMALLINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nombre, version)
);

-- Table: preguntas
CREATE TABLE preguntas (
  id SERIAL PRIMARY KEY,
  examen_id INT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  numero SMALLINT NOT NULL,
  tema VARCHAR(50) NOT NULL,
  enunciado_ca TEXT NOT NULL,
  enunciado_es TEXT,
  opcion_a_ca TEXT NOT NULL,
  opcion_a_es TEXT,
  opcion_b_ca TEXT NOT NULL,
  opcion_b_es TEXT,
  opcion_c_ca TEXT NOT NULL,
  opcion_c_es TEXT,
  opcion_d_ca TEXT NOT NULL,
  opcion_d_es TEXT,
  respuesta_correcta CHAR(1) CHECK (respuesta_correcta IN ('a', 'b', 'c', 'd')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(examen_id, numero)
);

-- Table: resultados_test (anonymous)
CREATE TABLE resultados_test (
  id SERIAL PRIMARY KEY,
  modo VARCHAR(20) NOT NULL CHECK (modo IN ('examen', 'tema', 'aleatori', 'repas')),
  examen_id INT REFERENCES examenes(id) ON DELETE SET NULL,
  tema_filtro VARCHAR(50),
  num_preguntas SMALLINT NOT NULL,
  correctas SMALLINT NOT NULL,
  tiempo_segundos INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_preguntas_examen ON preguntas(examen_id);
CREATE INDEX idx_preguntas_tema ON preguntas(tema);
CREATE INDEX idx_resultados_created ON resultados_test(created_at DESC);
CREATE INDEX idx_examenes_fecha ON examenes(fecha DESC);

-- Row Level Security
ALTER TABLE examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_test ENABLE ROW LEVEL SECURITY;

-- Public read access for examenes and preguntas
CREATE POLICY "Public read examenes" ON examenes
  FOR SELECT USING (true);

CREATE POLICY "Public read preguntas" ON preguntas
  FOR SELECT USING (true);

-- Anyone can insert resultados (anonymous)
CREATE POLICY "Public insert resultados" ON resultados_test
  FOR INSERT WITH CHECK (true);

-- Public read aggregated stats (optional, for estadistiques page)
CREATE POLICY "Public read resultados" ON resultados_test
  FOR SELECT USING (true);

-- View: estadistiques per tema
CREATE OR REPLACE VIEW estadistiques_temes AS
SELECT
  p.tema,
  COUNT(*) as total_preguntas,
  COUNT(rt.id) as total_respostes,
  SUM(CASE WHEN p.respuesta_correcta = (
    SELECT respuesta FROM respuestas_usuario ru
    WHERE ru.pregunta_id = p.id
    LIMIT 1
  ) THEN 1 ELSE 0 END) as correctes
FROM preguntas p
LEFT JOIN resultados_test rt ON rt.examen_id = p.examen_id
GROUP BY p.tema;

-- Comment
COMMENT ON TABLE examenes IS 'Official PER exams from Generalitat de Catalunya';
COMMENT ON TABLE preguntas IS 'Questions extracted from official exams, bilingual (CA/ES)';
COMMENT ON TABLE resultados_test IS 'Anonymous test results, no user association';
