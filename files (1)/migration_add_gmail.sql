-- ================================================
-- MIGRATION: Add gmail_accounts to location_logs
-- Run this in your Supabase SQL Editor
-- ================================================

ALTER TABLE location_logs
ADD COLUMN IF NOT EXISTS gmail_accounts TEXT[] DEFAULT '{}';

-- Also create a useful view for suspicious pings with gmail info
CREATE OR REPLACE VIEW suspicious_pings AS
SELECT
    ll.id,
    l.serial_number,
    l.brand,
    s.full_name AS assigned_to,
    s.student_id,
    ll.ip_address,
    ll.city,
    ll.country,
    ll.wifi_name,
    ll.os_user,
    ll.gmail_accounts,
    ll.latitude,
    ll.longitude,
    ll.logged_at
FROM location_logs ll
JOIN laptops l ON ll.laptop_id = l.id
LEFT JOIN students s ON l.assigned_to = s.id
WHERE ll.is_suspicious = TRUE
ORDER BY ll.logged_at DESC;
