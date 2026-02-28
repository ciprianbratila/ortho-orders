-- ============================================================
-- 003: Password hashing + asociere user-angajat
-- ============================================================

-- 1) Activăm extensia pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Funcție pentru hash parola
CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Funcție pentru verificare parolă
CREATE OR REPLACE FUNCTION verify_password(plain_password TEXT, hashed_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(plain_password, hashed_password) = hashed_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Funcție RPC pentru login securizat
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    username TEXT,
    nume TEXT,
    prenume TEXT,
    email TEXT,
    grup_id UUID,
    activ BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.nume, u.prenume, u.email, u.grup_id, u.activ, u.created_at, u.updated_at
    FROM utilizatori u
    WHERE u.username = p_username
      AND verify_password(p_password, u.parola);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Funcție RPC pentru schimbare parolă
CREATE OR REPLACE FUNCTION change_password(p_user_id UUID, p_old_password TEXT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_hash TEXT;
BEGIN
    SELECT parola INTO v_current_hash FROM utilizatori WHERE utilizatori.id = p_user_id;
    IF v_current_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    IF NOT verify_password(p_old_password, v_current_hash) THEN
        RETURN FALSE;
    END IF;
    UPDATE utilizatori SET parola = hash_password(p_new_password), updated_at = NOW() WHERE utilizatori.id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Funcție RPC pentru setare/reset parolă (admin sau self)
CREATE OR REPLACE FUNCTION set_password(p_user_id UUID, p_new_password TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE utilizatori SET parola = hash_password(p_new_password), updated_at = NOW() WHERE utilizatori.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Migrăm parolele existente (plain text) la hash
-- Verificăm dacă parolele nu sunt deja hash-uite (hash bcrypt începe cu $2)
UPDATE utilizatori
SET parola = hash_password(parola)
WHERE parola NOT LIKE '$2%';

-- 8) Adăugăm coloana utilizator_id pe angajați
ALTER TABLE angajati ADD COLUMN IF NOT EXISTS utilizator_id UUID REFERENCES utilizatori(id) ON DELETE SET NULL;
