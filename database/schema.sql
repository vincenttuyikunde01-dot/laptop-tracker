-- ================================================
-- LAPTOP TRACKER - DATABASE SCHEMA
-- University of Rwanda Anti-Theft System
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------
-- TABLE: students
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(20) UNIQUE NOT NULL,       -- e.g. "UR/IT/2021/001"
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    college VARCHAR(100) NOT NULL,                -- e.g. "College of Science and Technology"
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------
-- TABLE: laptops
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS laptops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) UNIQUE NOT NULL,       -- unique hardware fingerprint
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(50),                            -- e.g. "Lenovo", "HP"
    model VARCHAR(100),
    assigned_to UUID REFERENCES students(id),     -- which student owns it
    is_reported_stolen BOOLEAN DEFAULT FALSE,
    reported_stolen_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------
-- TABLE: location_logs
-- All pings sent from the laptop agent
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS location_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    laptop_id UUID REFERENCES laptops(id) NOT NULL,
    ip_address VARCHAR(50),
    latitude DECIMAL(10, 8),                      -- GPS latitude
    longitude DECIMAL(11, 8),                     -- GPS longitude
    wifi_name VARCHAR(100),                       -- connected WiFi SSID
    wifi_bssid VARCHAR(50),                       -- WiFi router MAC address
    country VARCHAR(60),
    city VARCHAR(60),
    isp VARCHAR(100),                             -- Internet Service Provider
    os_user VARCHAR(100),                         -- OS username active at time of ping
    is_suspicious BOOLEAN DEFAULT FALSE,          -- flagged by server logic
    logged_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------
-- TABLE: theft_reports
-- When a student reports their laptop stolen
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS theft_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    laptop_id UUID REFERENCES laptops(id) NOT NULL,
    student_id UUID REFERENCES students(id) NOT NULL,
    description TEXT,                             -- student's account of what happened
    last_seen_location VARCHAR(255),
    reported_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'open'             -- 'open', 'investigating', 'resolved'
);

-- ------------------------------------------------
-- TABLE: admins
-- University staff who manage the system
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff',             -- 'superadmin', 'staff'
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------
-- INDEXES for faster queries
-- ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_location_logs_laptop_id ON location_logs(laptop_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_logged_at ON location_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_laptops_assigned_to ON laptops(assigned_to);
CREATE INDEX IF NOT EXISTS idx_laptops_device_id ON laptops(device_id);

-- ------------------------------------------------
-- VIEW: latest_laptop_locations
-- Quick lookup of each laptop's most recent ping
-- ------------------------------------------------
CREATE OR REPLACE VIEW latest_laptop_locations AS
SELECT DISTINCT ON (l.id)
    l.id AS laptop_id,
    l.serial_number,
    l.brand,
    l.model,
    l.is_reported_stolen,
    s.full_name AS student_name,
    s.student_id,
    s.email AS student_email,
    ll.ip_address,
    ll.latitude,
    ll.longitude,
    ll.wifi_name,
    ll.city,
    ll.country,
    ll.os_user,
    ll.logged_at AS last_seen
FROM laptops l
LEFT JOIN students s ON l.assigned_to = s.id
LEFT JOIN location_logs ll ON ll.laptop_id = l.id
ORDER BY l.id, ll.logged_at DESC;
