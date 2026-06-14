-- init_db.sql — Inicialización PostgreSQL para TMS
-- Se ejecuta una sola vez al crear el contenedor de base de datos

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- para búsqueda de texto aproximada

-- El usuario y la base de datos ya son creados por las variables de entorno
-- POSTGRES_USER / POSTGRES_DB del contenedor de postgres
