-- Add agency_name to user_roles to link staff to specific agencies
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS agency_name TEXT;

-- Update existing admins/staff to default to the system agency if desired
-- UPDATE user_roles SET agency_name = 'AREYS' WHERE agency_name IS NULL;
