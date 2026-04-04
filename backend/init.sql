-- Database initialization script for Thalassemia Prediction System

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================
-- Users table (for auth)
-- ======================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default users (password hashed with bcrypt 12 rounds)
INSERT INTO users (username, hashed_password, is_active) VALUES
    ('admin',     '$2b$12$APsnTGopfS2VTwsvw6aZ8e2Zl76dvEGZ3NP2oILt1i6qFqHUnjP0G', TRUE),
    ('doctor',    '$2b$12$gXFR3XhhRR34rSXCzONJBOdF2L8mOpysdTuCdNRYxcyfh8w6grXj2', TRUE),
    ('doctor_01', '$2b$12$KVLv5.4dL12u7JopAMAdU.kqd5huOHAsjgt2cCuTO66MtxqDyIV5y', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ======================
    -- Father Information
    -- ======================
    father_patient_id VARCHAR(50),
    father_first_name VARCHAR(100),
    father_last_name VARCHAR(100),
    father_dob DATE NOT NULL,
    father_age INT NOT NULL CHECK (father_age >= 0),

    father_hb FLOAT NOT NULL CHECK (father_hb > 0),
    father_hct FLOAT NOT NULL CHECK (father_hct BETWEEN 0 AND 100),
    father_mcv FLOAT NOT NULL,
    father_mch FLOAT NOT NULL,
    father_dcip BOOLEAN NOT NULL,

    -- ======================
    -- Mother Information
    -- ======================
    mother_patient_id VARCHAR(50),
    mother_first_name VARCHAR(100),
    mother_last_name VARCHAR(100),
    mother_dob DATE NOT NULL,
    mother_age INT NOT NULL CHECK (mother_age >= 0),

    mother_hb FLOAT NOT NULL CHECK (mother_hb > 0),
    mother_hct FLOAT NOT NULL CHECK (mother_hct BETWEEN 0 AND 100),
    mother_mcv FLOAT NOT NULL,
    mother_mch FLOAT NOT NULL,
    mother_dcip BOOLEAN NOT NULL,

    -- ======================
    -- Model & Prediction
    -- ======================
    model_version VARCHAR(50) NOT NULL,
    threshold_used FLOAT NOT NULL,

    probability FLOAT NOT NULL CHECK (probability BETWEEN 0 AND 1),
    result VARCHAR(20) NOT NULL CHECK (result IN ('Risk','No Risk')),

    -- ======================
    -- Metadata
    -- ======================
    visit_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_predictions_father_patient_id ON predictions(father_patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_mother_patient_id ON predictions(mother_patient_id);
CREATE INDEX IF NOT EXISTS idx_predictions_visit_datetime ON predictions(visit_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_result ON predictions(result);
