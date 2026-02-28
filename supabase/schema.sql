-- ============================================
-- OrthoOrders - Schema Bază de Date Supabase
-- ============================================

-- Materii Prime
CREATE TABLE IF NOT EXISTS materii_prime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denumire TEXT NOT NULL,
    pret NUMERIC(10,2) NOT NULL DEFAULT 0,
    unitate_masura TEXT NOT NULL DEFAULT 'buc',
    stoc NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produse
CREATE TABLE IF NOT EXISTS produse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denumire TEXT NOT NULL,
    descriere TEXT DEFAULT '',
    produs_parinte_id UUID REFERENCES produse(id) ON DELETE SET NULL,
    pret_manopera NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Componente Produs (materiale folosite într-un produs)
CREATE TABLE IF NOT EXISTS produse_componente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produs_id UUID NOT NULL REFERENCES produse(id) ON DELETE CASCADE,
    materie_prima_id UUID NOT NULL REFERENCES materii_prime(id) ON DELETE CASCADE,
    cantitate NUMERIC(10,3) NOT NULL DEFAULT 0,
    UNIQUE(produs_id, materie_prima_id)
);

-- Clienți
CREATE TABLE IF NOT EXISTS clienti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nume TEXT NOT NULL,
    prenume TEXT NOT NULL DEFAULT '',
    cnp TEXT DEFAULT '',
    telefon TEXT DEFAULT '',
    email TEXT DEFAULT '',
    adresa TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documente Client
CREATE TABLE IF NOT EXISTS documente_client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
    tip TEXT NOT NULL DEFAULT 'altele',
    denumire TEXT NOT NULL DEFAULT '',
    nume_document TEXT,
    fisier_base64 TEXT,
    observatii TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Angajați
CREATE TABLE IF NOT EXISTS angajati (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nume TEXT NOT NULL,
    prenume TEXT NOT NULL DEFAULT '',
    functie TEXT NOT NULL DEFAULT '',
    telefon TEXT DEFAULT '',
    email TEXT DEFAULT '',
    activ BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comenzi
CREATE TABLE IF NOT EXISTS comenzi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numar_comanda TEXT NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
    tehnician_id UUID REFERENCES angajati(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'noua',
    metoda_plata TEXT NOT NULL DEFAULT 'cash',
    data_comanda TEXT NOT NULL,
    data_livrare_estimata TEXT NOT NULL,
    data_livrare_efectiva TEXT,
    avans NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_calculat NUMERIC(10,2) NOT NULL DEFAULT 0,
    observatii TEXT DEFAULT '',
    -- Decizie CAS (inline)
    decizie_cas_numar_document TEXT,
    decizie_cas_data_document TEXT,
    decizie_cas_valoare NUMERIC(10,2) DEFAULT 0,
    decizie_cas_nume_document TEXT,
    decizie_cas_fisier_base64 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produse Comandă (produse asociate unei comenzi)
CREATE TABLE IF NOT EXISTS comenzi_produse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_id UUID NOT NULL REFERENCES comenzi(id) ON DELETE CASCADE,
    produs_id UUID NOT NULL REFERENCES produse(id) ON DELETE RESTRICT,
    cantitate INTEGER NOT NULL DEFAULT 1,
    observatii TEXT DEFAULT ''
);

-- Facturi
CREATE TABLE IF NOT EXISTS facturi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numar_factura TEXT NOT NULL UNIQUE,
    comanda_id UUID NOT NULL REFERENCES comenzi(id) ON DELETE RESTRICT,
    numar_comanda TEXT NOT NULL,
    -- Date client factura (snapshot la momentul emiterii)
    client_nume TEXT NOT NULL DEFAULT '',
    client_prenume TEXT NOT NULL DEFAULT '',
    client_cnp TEXT DEFAULT '',
    client_telefon TEXT DEFAULT '',
    client_email TEXT DEFAULT '',
    client_adresa TEXT DEFAULT '',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    tva NUMERIC(5,2) NOT NULL DEFAULT 19,
    total_tva NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_factura NUMERIC(10,2) NOT NULL DEFAULT 0,
    metoda_plata TEXT NOT NULL DEFAULT 'cash',
    avans NUMERIC(10,2) NOT NULL DEFAULT 0,
    decizie_cas_valoare NUMERIC(10,2) NOT NULL DEFAULT 0,
    rest_plata NUMERIC(10,2) NOT NULL DEFAULT 0,
    data_emitere TEXT NOT NULL,
    data_scadenta TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'emisa',
    observatii TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Linii Factură
CREATE TABLE IF NOT EXISTS facturi_linii (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES facturi(id) ON DELETE CASCADE,
    denumire TEXT NOT NULL,
    cantitate INTEGER NOT NULL DEFAULT 1,
    pret_unitar NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Grupuri Utilizatori
CREATE TABLE IF NOT EXISTS grupuri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denumire TEXT NOT NULL,
    descriere TEXT DEFAULT '',
    module_acces TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Utilizatori
CREATE TABLE IF NOT EXISTS utilizatori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    parola TEXT NOT NULL,
    nume TEXT NOT NULL,
    prenume TEXT NOT NULL DEFAULT '',
    email TEXT DEFAULT '',
    grup_id UUID NOT NULL REFERENCES grupuri(id) ON DELETE RESTRICT,
    activ BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Counter pentru numere comenzi
CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO counters (name, value) VALUES ('comenzi', 0) ON CONFLICT DO NOTHING;

-- ============================================
-- Disable RLS for simplicity (app-level auth)
-- ============================================
ALTER TABLE materii_prime ENABLE ROW LEVEL SECURITY;
ALTER TABLE produse ENABLE ROW LEVEL SECURITY;
ALTER TABLE produse_componente ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE documente_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE angajati ENABLE ROW LEVEL SECURITY;
ALTER TABLE comenzi ENABLE ROW LEVEL SECURITY;
ALTER TABLE comenzi_produse ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturi ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturi_linii ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupuri ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilizatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key
CREATE POLICY "Allow all" ON materii_prime FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON produse FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON produse_componente FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON clienti FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON documente_client FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON angajati FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comenzi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comenzi_produse FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON facturi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON facturi_linii FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON grupuri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON utilizatori FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON counters FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Grupuri
INSERT INTO grupuri (id, denumire, descriere, module_acces) VALUES
('00000000-0000-0000-0000-000000000001', 'Administratori', 'Acces complet la toate modulele aplicației, inclusiv administrare', ARRAY['dashboard','comenzi','facturi','clienti','angajati','produse','materii-prime','admin']),
('00000000-0000-0000-0000-000000000002', 'Management', 'Acces la comenzi, facturi, clienți, angajați și rapoarte', ARRAY['dashboard','comenzi','facturi','clienti','angajati']),
('00000000-0000-0000-0000-000000000003', 'Producție', 'Acces la produse, materii prime și comenzi', ARRAY['dashboard','comenzi','produse','materii-prime']),
('00000000-0000-0000-0000-000000000004', 'Vânzări', 'Acces la comenzi, facturi și clienți', ARRAY['dashboard','comenzi','facturi','clienti'])
ON CONFLICT DO NOTHING;

-- Utilizatori (parola: 1234)
INSERT INTO utilizatori (id, username, parola, nume, prenume, email, grup_id, activ) VALUES
('00000000-0000-0000-0001-000000000001', 'admin', '1234', 'Administrator', 'System', 'admin@ortho.ro', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0001-000000000002', 'maria.ionescu', '1234', 'Ionescu', 'Maria', 'maria.ionescu@ortho.ro', '00000000-0000-0000-0000-000000000002', true),
('00000000-0000-0000-0001-000000000003', 'andrei.pop', '1234', 'Pop', 'Andrei', 'andrei.pop@ortho.ro', '00000000-0000-0000-0000-000000000003', true),
('00000000-0000-0000-0001-000000000004', 'elena.vasile', '1234', 'Vasile', 'Elena', 'elena.vasile@ortho.ro', '00000000-0000-0000-0000-000000000004', true)
ON CONFLICT DO NOTHING;

-- Materii Prime
INSERT INTO materii_prime (id, denumire, pret, unitate_masura, stoc) VALUES
('00000000-0000-0000-0002-000000000001', 'Piele naturală', 45.00, 'mp', 100),
('00000000-0000-0000-0002-000000000002', 'Piele sintetică', 25.00, 'mp', 150),
('00000000-0000-0000-0002-000000000003', 'Talpă ortopedică standard', 35.00, 'buc', 200),
('00000000-0000-0000-0002-000000000004', 'Talpă ortopedică sport', 55.00, 'buc', 80),
('00000000-0000-0000-0002-000000000005', 'Branț anatomic', 15.00, 'buc', 300),
('00000000-0000-0000-0002-000000000006', 'Armatură metalică', 12.00, 'buc', 250),
('00000000-0000-0000-0002-000000000007', 'Căptușeală textilă', 8.00, 'mp', 180),
('00000000-0000-0000-0002-000000000008', 'Șiret', 2.50, 'pereche', 500),
('00000000-0000-0000-0002-000000000009', 'Cataramă reglabilă', 5.00, 'buc', 200),
('00000000-0000-0000-0002-000000000010', 'Bandă velcro', 3.00, 'ml', 300),
('00000000-0000-0000-0002-000000000011', 'Spumă memory foam', 20.00, 'mp', 120),
('00000000-0000-0000-0002-000000000012', 'Gel siliconic', 18.00, 'kg', 50),
('00000000-0000-0000-0002-000000000013', 'Inserție carbon', 30.00, 'buc', 60),
('00000000-0000-0000-0002-000000000014', 'Adeziv industrial', 10.00, 'kg', 40),
('00000000-0000-0000-0002-000000000015', 'Ață chirurgicală', 8.00, 'rolă', 100),
('00000000-0000-0000-0002-000000000016', 'Material reflectorizant', 12.00, 'mp', 45),
('00000000-0000-0000-0002-000000000017', 'Burete protecție', 6.00, 'mp', 200),
('00000000-0000-0000-0002-000000000018', 'Elastic medical', 4.00, 'ml', 400),
('00000000-0000-0000-0002-000000000019', 'Fermoar rezistent', 7.00, 'buc', 150),
('00000000-0000-0000-0002-000000000020', 'Întăritură plastic', 9.00, 'buc', 180)
ON CONFLICT DO NOTHING;

-- Angajați
INSERT INTO angajati (id, nume, prenume, functie, telefon, email, activ) VALUES
('00000000-0000-0000-0003-000000000001', 'Popescu', 'Ion', 'Tehnician ortoped', '0722111222', 'ion.popescu@ortho.ro', true),
('00000000-0000-0000-0003-000000000002', 'Dumitrescu', 'Ana', 'Tehnician ortoped', '0722333444', 'ana.dumitrescu@ortho.ro', true),
('00000000-0000-0000-0003-000000000003', 'Marin', 'George', 'Tehnician senior', '0722555666', 'george.marin@ortho.ro', true)
ON CONFLICT DO NOTHING;

-- Clienți
INSERT INTO clienti (id, nume, prenume, cnp, telefon, email, adresa) VALUES
('00000000-0000-0000-0004-000000000001', 'Popescu', 'Ion', '1850315123456', '0722111222', 'ion.popescu@email.ro', 'Str. Victoriei nr. 10, București'),
('00000000-0000-0000-0004-000000000002', 'Ionescu', 'Maria', '2900520234567', '0733222333', 'maria.ionescu@email.ro', 'Bd. Unirii nr. 25, Cluj-Napoca'),
('00000000-0000-0000-0004-000000000003', 'Georgescu', 'Andrei', '1780210345678', '0744333444', 'andrei.georgescu@email.ro', 'Str. Libertății nr. 8, Timișoara')
ON CONFLICT DO NOTHING;

-- Produse
INSERT INTO produse (id, denumire, descriere, produs_parinte_id, pret_manopera) VALUES
('00000000-0000-0000-0005-000000000001', 'Gheată ortopedică standard', 'Gheată ortopedică clasică cu suport anatomic', NULL, 120),
('00000000-0000-0000-0005-000000000002', 'Gheată ortopedică sport', 'Gheată sport bazată pe modelul standard, cu materiale suplimentare', '00000000-0000-0000-0005-000000000001', 80),
('00000000-0000-0000-0005-000000000003', 'Branț ortopedic personalizat', 'Branț cu suport plantar adaptat', NULL, 40)
ON CONFLICT DO NOTHING;

-- Componente produse
INSERT INTO produse_componente (produs_id, materie_prima_id, cantitate) VALUES
-- Gheată standard: piele naturală, talpă standard, branț, căptușeală, șiret
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001', 0.5),
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000003', 2),
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000005', 2),
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000007', 0.3),
('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000008', 2),
-- Gheată sport (extra): talpă sport, inserție carbon, material reflectorizant
('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0002-000000000004', 2),
('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0002-000000000013', 2),
('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0002-000000000016', 0.2),
-- Branț: spumă, gel siliconic
('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0002-000000000011', 0.1),
('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0002-000000000012', 0.05)
ON CONFLICT DO NOTHING;
