-- Add agency name and tagline to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS agency_name TEXT DEFAULT 'AREYS',
ADD COLUMN IF NOT EXISTS agency_tagline TEXT DEFAULT 'Travel Agency';
