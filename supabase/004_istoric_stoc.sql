-- ============================================
-- 004 - Istoric Stoc (Stock History)
-- ============================================

CREATE TABLE IF NOT EXISTS istoric_stoc (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    materie_prima_id UUID NOT NULL REFERENCES materii_prime(id) ON DELETE CASCADE,
    tip_miscare TEXT NOT NULL CHECK (tip_miscare IN ('achizitie', 'comanda', 'corectie', 'anulare_comanda')),
    cantitate NUMERIC NOT NULL, -- positive = increase, negative = decrease
    stoc_anterior NUMERIC NOT NULL,
    stoc_nou NUMERIC NOT NULL,
    comanda_id UUID REFERENCES comenzi(id) ON DELETE SET NULL,
    numar_comanda TEXT, -- stored separately so it persists if order is deleted
    observatii TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by materie_prima_id
CREATE INDEX IF NOT EXISTS idx_istoric_stoc_materie ON istoric_stoc(materie_prima_id);
CREATE INDEX IF NOT EXISTS idx_istoric_stoc_comanda ON istoric_stoc(comanda_id);

-- Add stoc_rezervat column to materii_prime (for future use)
-- ALTER TABLE materii_prime ADD COLUMN IF NOT EXISTS stoc_rezervat NUMERIC DEFAULT 0;

-- Enable RLS and allow all (app-level auth)
ALTER TABLE istoric_stoc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON istoric_stoc FOR ALL USING (true) WITH CHECK (true);
