-- ============================================
-- 006 - Adaos Comercial pe Produse
-- ============================================

-- tip_adaos: 'valoric' = fixed amount, 'procentual' = percentage of (materii prime + manopera)
ALTER TABLE produse ADD COLUMN IF NOT EXISTS adaos_comercial NUMERIC DEFAULT 0;
ALTER TABLE produse ADD COLUMN IF NOT EXISTS tip_adaos TEXT DEFAULT 'valoric' CHECK (tip_adaos IN ('valoric', 'procentual'));
