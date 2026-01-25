-- Resource Scheduling for Solution Consultants
-- Migration: 20260125200400_resource_scheduling.sql

-- Resource skills/expertise tracking
CREATE TABLE IF NOT EXISTS resource_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50), -- 'product', 'technology', 'industry', 'language'
    proficiency_level INTEGER DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, skill_name)
);

-- Resource availability (recurring weekly schedule)
CREATE TABLE IF NOT EXISTS resource_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Booking status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

-- Resource bookings
CREATE TABLE IF NOT EXISTS resource_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Resource being booked
    resource_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Who made the booking
    booked_by UUID NOT NULL REFERENCES profiles(id),
    
    -- What it's for
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
    demo_id UUID REFERENCES demos(id) ON DELETE SET NULL,
    
    -- Booking details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    booking_type VARCHAR(50) NOT NULL, -- 'demo', 'poc', 'call', 'training', 'internal'
    
    -- Timing
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60
    ) STORED,
    
    -- Status
    status booking_status NOT NULL DEFAULT 'pending',
    
    -- Notes
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_booking_time CHECK (scheduled_start < scheduled_end)
);

-- Time-off / blocked time (overrides availability)
CREATE TABLE IF NOT EXISTS resource_blocked_time (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    block_type VARCHAR(50) DEFAULT 'time_off', -- 'time_off', 'meeting', 'focus_time'
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_block_range CHECK (start_datetime < end_datetime)
);

-- Indexes
CREATE INDEX idx_resource_skills_user ON resource_skills(user_id);
CREATE INDEX idx_resource_skills_category ON resource_skills(skill_category);
CREATE INDEX idx_resource_availability_user ON resource_availability(user_id);
CREATE INDEX idx_resource_bookings_resource ON resource_bookings(resource_id);
CREATE INDEX idx_resource_bookings_scheduled ON resource_bookings(scheduled_start, scheduled_end);
CREATE INDEX idx_resource_bookings_status ON resource_bookings(status);
CREATE INDEX idx_resource_blocked_user ON resource_blocked_time(user_id);

-- Enable RLS
ALTER TABLE resource_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_blocked_time ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skills
CREATE POLICY "Skills viewable by all authenticated users"
    ON resource_skills FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own skills"
    ON resource_skills FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'manager')
    ));

-- RLS Policies for availability
CREATE POLICY "Availability viewable by all authenticated users"
    ON resource_availability FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own availability"
    ON resource_availability FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'manager')
    ));

-- RLS Policies for bookings
CREATE POLICY "Bookings viewable by involved parties and managers"
    ON resource_bookings FOR SELECT
    USING (
        resource_id = auth.uid() OR
        booked_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager', 'ceo')
        )
    );

CREATE POLICY "Solution consultants and sales can create bookings"
    ON resource_bookings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('solution_consultant', 'sales', 'manager', 'admin')
        )
    );

CREATE POLICY "Users can update their bookings"
    ON resource_bookings FOR UPDATE
    USING (
        resource_id = auth.uid() OR
        booked_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'manager')
        )
    );

-- RLS for blocked time
CREATE POLICY "Blocked time viewable by all authenticated users"
    ON resource_blocked_time FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own blocked time"
    ON resource_blocked_time FOR ALL
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'manager')
    ));

-- Triggers
CREATE TRIGGER update_resource_availability_updated_at
    BEFORE UPDATE ON resource_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_bookings_updated_at
    BEFORE UPDATE ON resource_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
    p_resource_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ,
    p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM resource_bookings
        WHERE resource_id = p_resource_id
        AND status NOT IN ('cancelled')
        AND (p_exclude_id IS NULL OR id != p_exclude_id)
        AND scheduled_start < p_end
        AND scheduled_end > p_start
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE resource_skills IS 'Tracks skills and expertise for Solution Consultants';
COMMENT ON TABLE resource_availability IS 'Weekly recurring availability schedule';
COMMENT ON TABLE resource_bookings IS 'Scheduled bookings for demos, POCs, and calls';
COMMENT ON TABLE resource_blocked_time IS 'Blocked time periods (vacation, meetings, etc.)';
