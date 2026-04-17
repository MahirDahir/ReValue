-- Migration 001: Rename bottle_type → waste_category, add unit column
-- Run against any database that has data from the RecycleBottles POC era.
-- New installs: SQLAlchemy creates_all() applies the new schema automatically.

-- Step 1: rename the column
ALTER TABLE listings RENAME COLUMN bottle_type TO waste_category;

-- Step 2: add unit column (default pieces for all existing rows)
ALTER TABLE listings ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'pieces';

-- Step 3: remap old category values to new ones
UPDATE listings SET waste_category = 'metal' WHERE waste_category = 'aluminum';
UPDATE listings SET waste_category = 'other' WHERE waste_category = 'mixed';
-- 'plastic' and 'glass' map 1-to-1, no update needed
