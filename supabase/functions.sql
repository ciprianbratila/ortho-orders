-- Funcție RPC pentru incrementare counter atomic
CREATE OR REPLACE FUNCTION increment_counter(counter_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    new_val INTEGER;
BEGIN
    UPDATE counters SET value = value + 1 WHERE name = counter_name RETURNING value INTO new_val;
    IF NOT FOUND THEN
        INSERT INTO counters (name, value) VALUES (counter_name, 1);
        new_val := 1;
    END IF;
    RETURN new_val;
END;
$$ LANGUAGE plpgsql;
