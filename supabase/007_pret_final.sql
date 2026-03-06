-- ============================================
-- 007 - Preț Final Îngheṭat pe Produse
-- ============================================

-- pret_final: frozen total price saved at product creation/edit
ALTER TABLE produse ADD COLUMN IF NOT EXISTS pret_final NUMERIC DEFAULT 0;

-- Initialize pret_final for existing products (will be recalculated on first edit)
-- For now set to 0, the app will show dynamic price if pret_final is 0
