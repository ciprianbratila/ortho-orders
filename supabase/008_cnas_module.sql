-- ============================================
-- 008 - Modul CNAS (Casa Nationala de Asigurari de Sanatate)
-- ============================================

-- Nomenclator produse CNAS (produse acceptate pentru decontare)
CREATE TABLE IF NOT EXISTS produse_cnas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denumire TEXT NOT NULL,
    cod TEXT DEFAULT '',
    descriere TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setari CNAS (valoare decontare globala)
CREATE TABLE IF NOT EXISTS setari_cnas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valoare_decontare NUMERIC(10,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Inseram un rand default
INSERT INTO setari_cnas (valoare_decontare) VALUES (0) ON CONFLICT DO NOTHING;

-- Decizie CNAS la nivel de produs pe comanda
-- Inlocuieste vechile campuri decizie_cas_* de pe comenzi
ALTER TABLE comenzi_produse ADD COLUMN IF NOT EXISTS decizie_cnas_numar TEXT;
ALTER TABLE comenzi_produse ADD COLUMN IF NOT EXISTS decizie_cnas_data TEXT;
ALTER TABLE comenzi_produse ADD COLUMN IF NOT EXISTS decizie_cnas_valoare NUMERIC(10,2) DEFAULT 0;
ALTER TABLE comenzi_produse ADD COLUMN IF NOT EXISTS decizie_cnas_nume_document TEXT;
ALTER TABLE comenzi_produse ADD COLUMN IF NOT EXISTS decizie_cnas_fisier_base64 TEXT;

-- Comenzi CNAS (1 comanda CNAS = 1 produs de pe comanda client)
CREATE TABLE IF NOT EXISTS comenzi_cnas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_id UUID NOT NULL REFERENCES comenzi(id) ON DELETE CASCADE,
    comanda_produs_id UUID NOT NULL REFERENCES comenzi_produse(id) ON DELETE CASCADE,
    numar_comanda_cnas TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'noua' CHECK (status IN ('noua', 'trimisa', 'aprobata', 'respinsa')),
    observatii TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produse CNAS asociate unei comenzi CNAS (mapare produs comanda -> produse nomenclator CNAS)
CREATE TABLE IF NOT EXISTS comenzi_cnas_produse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_cnas_id UUID NOT NULL REFERENCES comenzi_cnas(id) ON DELETE CASCADE,
    produs_cnas_id UUID NOT NULL REFERENCES produse_cnas(id) ON DELETE RESTRICT,
    cantitate INTEGER NOT NULL DEFAULT 1
);

-- Counter pentru comenzi CNAS
INSERT INTO counters (name, value) VALUES ('comenzi_cnas', 0) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE produse_cnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE setari_cnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comenzi_cnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comenzi_cnas_produse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON produse_cnas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON setari_cnas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comenzi_cnas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comenzi_cnas_produse FOR ALL USING (true) WITH CHECK (true);

-- Acorda acces la modulul CNAS pentru grupul Administratori
UPDATE grupuri
SET module_acces = array_append(module_acces, 'cnas')
WHERE id = '00000000-0000-0000-0000-000000000001' AND NOT ('cnas' = ANY(module_acces));
