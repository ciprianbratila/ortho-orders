-- ============================================
-- 005 - Valoare Stoc & Preț Achiziție
-- ============================================

-- Add valoare_stoc column to materii_prime (total stock value)
ALTER TABLE materii_prime ADD COLUMN IF NOT EXISTS valoare_stoc NUMERIC DEFAULT 0;

-- Add pret_achizitie column to istoric_stoc (purchase price per unit)
ALTER TABLE istoric_stoc ADD COLUMN IF NOT EXISTS pret_achizitie NUMERIC DEFAULT NULL;

-- Initialize valoare_stoc = pret * stoc for existing records
UPDATE materii_prime SET valoare_stoc = pret * stoc WHERE valoare_stoc = 0 AND stoc > 0;
