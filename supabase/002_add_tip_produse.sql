-- Coloana tip pentru produse (produs sau serviciu)
ALTER TABLE produse ADD COLUMN IF NOT EXISTS tip TEXT NOT NULL DEFAULT 'produs';

-- Actualizăm produsele existente ca fiind 'produs'
UPDATE produse SET tip = 'produs' WHERE tip IS NULL OR tip = '';
